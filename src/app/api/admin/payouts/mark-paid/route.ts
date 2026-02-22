import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { commissionIds, wiseTransferId, repId } = await request.json()

    // 1. Validate wiseTransferId
    if (!wiseTransferId || !wiseTransferId.trim()) {
      return NextResponse.json(
        { error: 'Wise Transfer ID is required' },
        { status: 400 }
      )
    }

    if (!commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json(
        { error: 'Commission IDs are required' },
        { status: 400 }
      )
    }

    // 2. Fetch all requested commissions
    const commissions = await prisma.commission.findMany({
      where: { id: { in: commissionIds } },
      include: { rep: { select: { name: true } } },
    })

    if (commissions.length !== commissionIds.length) {
      return NextResponse.json(
        { error: 'Some commissions were not found' },
        { status: 400 }
      )
    }

    // 3. Validate ALL are PENDING or APPROVED
    const invalidStatuses = commissions.filter(
      (c) => !['PENDING', 'APPROVED'].includes(c.status)
    )
    if (invalidStatuses.length > 0) {
      return NextResponse.json(
        { error: 'Some commissions are already paid or rejected' },
        { status: 400 }
      )
    }

    // 4. Validate ALL positive commissions are older than 7 days (server-side)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const tooNew = commissions.filter(
      (c) => c.createdAt > sevenDaysAgo && c.amount > 0
    )
    if (tooNew.length > 0) {
      return NextResponse.json(
        { error: 'Some commissions are less than 7 days old and not yet payable' },
        { status: 400 }
      )
    }

    // 5. Validate net amount is positive
    const netAmount = commissions.reduce((sum, c) => sum + c.amount, 0)
    if (netAmount <= 0) {
      return NextResponse.json(
        { error: 'Net payout amount must be positive. Rep has outstanding clawbacks.' },
        { status: 400 }
      )
    }

    // 6. Generate batch ID
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const batchId = `payout_${dateStr}_${(repId || commissions[0]?.repId || 'unknown').slice(0, 8)}`

    // 7. Update all in transaction
    await prisma.$transaction([
      prisma.commission.updateMany({
        where: { id: { in: commissionIds } },
        data: {
          status: 'PAID',
          paidAt: now,
          wiseTransferId: wiseTransferId.trim(),
          payoutBatchId: batchId,
        },
      }),
    ])

    // 8. Notify rep
    const totalPaid = commissions.reduce((sum, c) => sum + c.amount, 0)
    const repName = commissions[0]?.rep?.name || 'Rep'
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Commission Paid',
        message: `$${totalPaid.toFixed(2)} has been sent to your account via Wise. Transfer ID: ${wiseTransferId.trim()}`,
        metadata: {
          batchId,
          wiseTransferId: wiseTransferId.trim(),
          totalPaid,
          commissionCount: commissionIds.length,
          repId: repId || commissions[0]?.repId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      batchId,
      count: commissionIds.length,
      totalPaid,
      repName,
    })
  } catch (error) {
    console.error('Error marking commissions as paid:', error)
    return NextResponse.json(
      { error: 'Failed to mark commissions as paid' },
      { status: 500 }
    )
  }
}
