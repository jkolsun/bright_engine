import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

function parseCommissionMeta(notes: string | null) {
  if (!notes) return { dealAmount: '', commissionRate: '' }
  try {
    const meta = JSON.parse(notes)
    return {
      dealAmount: meta.dealAmount ? `$${meta.dealAmount.toFixed(2)}` : '',
      commissionRate: meta.commissionRate ? `${Math.round(meta.commissionRate * 100)}%` : '',
    }
  } catch {
    return { dealAmount: '', commissionRate: '' }
  }
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
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

    const where: any = {}
    if (view === 'history') {
      where.status = 'PAID'
    } else {
      where.status = { in: ['PENDING', 'APPROVED'] }
    }
    if (repId) where.repId = repId

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        rep: { select: { name: true, email: true } },
        client: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const headers = [
      'Date', 'Rep Name', 'Rep Email', 'Client Name', 'Type',
      'Deal Amount', 'Commission Rate', 'Commission Amount',
      'Status', 'Wise Transfer ID', 'Batch ID', 'Notes',
    ]

    const rows = commissions.map((c) => {
      const meta = parseCommissionMeta(c.notes)
      let plainNotes = ''
      try {
        const parsed = JSON.parse(c.notes || '{}')
        plainNotes = parsed.rejectedReason || parsed.reason || parsed.tier || ''
      } catch {
        plainNotes = c.notes || ''
      }
      return [
        new Date(c.createdAt).toISOString().split('T')[0],
        c.rep?.name || '',
        c.rep?.email || '',
        c.client?.companyName || '',
        c.type,
        meta.dealAmount,
        meta.commissionRate,
        `$${c.amount.toFixed(2)}`,
        c.status,
        c.wiseTransferId || '',
        c.payoutBatchId || '',
        plainNotes,
      ].map((v) => escapeCSV(String(v)))
    })

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ba_payouts_${view}_${dateStr}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting payouts:', error)
    return NextResponse.json({ error: 'Failed to export payouts' }, { status: 500 })
  }
}
