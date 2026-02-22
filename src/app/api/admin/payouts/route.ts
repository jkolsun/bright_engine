import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function parseCommissionMeta(notes: string | null) {
  if (!notes) return { dealAmount: null, commissionRate: null, tier: null }
  try {
    const meta = JSON.parse(notes)
    return {
      dealAmount: meta.dealAmount || null,
      commissionRate: meta.commissionRate || null,
      tier: meta.tier || null,
    }
  } catch {
    return { dealAmount: null, commissionRate: null, tier: null }
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const view = searchParams.get('view') || 'pending'
    const repId = searchParams.get('repId')

    if (view === 'history') {
      // History view: PAID commissions grouped by payoutBatchId
      const commissions = await prisma.commission.findMany({
        where: {
          status: 'PAID',
          ...(repId ? { repId } : {}),
        },
        include: {
          rep: { select: { id: true, name: true, email: true } },
          client: { select: { id: true, companyName: true } },
        },
        orderBy: { paidAt: 'desc' },
        take: 500,
      })

      // Group by payoutBatchId
      const batches: Record<string, any> = {}
      for (const c of commissions) {
        const batchId = c.payoutBatchId || `unbatched_${c.id}`
        if (!batches[batchId]) {
          batches[batchId] = {
            batchId: c.payoutBatchId || null,
            wiseTransferId: c.wiseTransferId || null,
            paidAt: c.paidAt,
            repName: c.rep?.name || 'Unknown',
            repEmail: c.rep?.email || '',
            repId: c.repId,
            totalPaid: 0,
            commissions: [],
          }
        }
        const meta = parseCommissionMeta(c.notes)
        batches[batchId].totalPaid += c.amount
        batches[batchId].commissions.push({
          id: c.id,
          clientName: c.client?.companyName || 'Unknown',
          type: c.type,
          amount: c.amount,
          dealAmount: meta.dealAmount,
          commissionRate: meta.commissionRate,
          createdAt: c.createdAt,
          paidAt: c.paidAt,
        })
      }

      return NextResponse.json({
        batches: Object.values(batches),
      })
    }

    // Pending view: all non-PAID, non-REJECTED commissions
    const commissions = await prisma.commission.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED'] },
        ...(repId ? { repId } : {}),
      },
      include: {
        rep: { select: { id: true, name: true, email: true, commissionRate: true } },
        client: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Group by rep
    const repMap: Record<string, any> = {}
    for (const c of commissions) {
      if (!repMap[c.repId]) {
        repMap[c.repId] = {
          repId: c.repId,
          repName: c.rep?.name || 'Unknown',
          repEmail: c.rep?.email || '',
          commissionRate: (c.rep as any)?.commissionRate ?? 0.5,
          payableTotal: 0,
          pendingTotal: 0,
          clawbackTotal: 0,
          netPayable: 0,
          commissions: [],
        }
      }

      const meta = parseCommissionMeta(c.notes)
      const isPayable = c.createdAt <= sevenDaysAgo || c.amount < 0 // clawbacks are always payable
      const payableDate = new Date(c.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      const isClawback = c.amount < 0

      if (isClawback) {
        repMap[c.repId].clawbackTotal += c.amount
      } else if (isPayable) {
        repMap[c.repId].payableTotal += c.amount
      } else {
        repMap[c.repId].pendingTotal += c.amount
      }

      repMap[c.repId].commissions.push({
        id: c.id,
        clientName: c.client?.companyName || 'Unknown',
        type: c.type,
        dealAmount: meta.dealAmount,
        commissionRate: meta.commissionRate,
        commissionAmount: c.amount,
        status: c.status,
        isPayable,
        payableDate: payableDate.toISOString(),
        isClawback,
        createdAt: c.createdAt,
        notes: c.notes,
      })
    }

    // Calculate net payable per rep
    for (const rep of Object.values(repMap)) {
      rep.netPayable = rep.payableTotal + rep.clawbackTotal
    }

    // Calculate totals
    const [paidThisMonth, paidAllTime] = await Promise.all([
      prisma.commission.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
      prisma.commission.aggregate({
        where: { status: 'PAID' },
        _sum: { amount: true },
      }),
    ])

    const reps = Object.values(repMap)
    const totalPayable = reps.reduce((sum: number, r: any) => sum + r.payableTotal, 0)
    const totalPending = reps.reduce((sum: number, r: any) => sum + r.pendingTotal, 0)
    const totalClawbacks = reps.reduce((sum: number, r: any) => sum + r.clawbackTotal, 0)

    return NextResponse.json({
      reps,
      totals: {
        totalPayable,
        totalPending,
        totalClawbacks,
        netPayable: totalPayable + totalClawbacks,
        paidThisMonth: paidThisMonth._sum.amount || 0,
        paidAllTime: paidAllTime._sum.amount || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}
