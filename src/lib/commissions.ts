import { prisma } from './db'

/**
 * Commission Calculator
 * Automatically calculates and creates commissions when deals close
 */

export interface CommissionCalculation {
  repId: string
  clientId: string
  revenueType: string
  baseAmount: number
  commissionRate: number
  commissionAmount: number
  tier: string
}

export async function calculateCommission(params: {
  repId: string
  clientId: string
  revenueType: string
  amount: number
}): Promise<CommissionCalculation | null> {
  try {
    const { repId, clientId, revenueType, amount } = params

    // Get rep details and performance
    const rep = await prisma.user.findUnique({
      where: { id: repId },
      include: {
        _count: {
          select: {
            assignedLeads: {
              where: { status: 'PAID' }
            }
          }
        }
      }
    })

    if (!rep || rep.role !== 'REP') {
      return null
    }

    // Get rep's commission rate (default 50%)
    const baseRate = (rep as any).commissionRate ?? 0.5

    // Calculate performance tier
    const closedDeals = rep._count.assignedLeads
    let tier = 'STANDARD'
    let rateMultiplier = 1

    if (closedDeals >= 20) {
      tier = 'TOP_PERFORMER'
      rateMultiplier = 1.2 // 20% bonus
    } else if (closedDeals >= 10) {
      tier = 'PERFORMANCE' 
      rateMultiplier = 1.1 // 10% bonus
    }

    // Commission is 50% of anything the rep directly sells
    // No type-based reduction — same rate for site builds, hosting, and upsells
    const finalRate = baseRate * rateMultiplier
    const commissionAmount = Math.round(amount * finalRate * 100) / 100

    return {
      repId,
      clientId,
      revenueType,
      baseAmount: amount,
      commissionRate: finalRate,
      commissionAmount,
      tier
    }
  } catch (error) {
    console.error('Commission calculation error:', error)
    return null
  }
}

export async function createCommission(calculation: CommissionCalculation) {
  try {
    // Map revenue type to Commission enum
    let commType: 'SITE_BUILD' | 'MONTHLY_RESIDUAL' | 'BONUS' = 'SITE_BUILD'
    if (calculation.revenueType === 'HOSTING_MONTHLY') commType = 'MONTHLY_RESIDUAL'
    else if (calculation.revenueType === 'BONUS') commType = 'BONUS'

    const commission = await prisma.commission.create({
      data: {
        repId: calculation.repId,
        clientId: calculation.clientId,
        type: commType,
        amount: calculation.commissionAmount,
        status: 'PENDING',
        notes: JSON.stringify({
          dealAmount: calculation.baseAmount,
          commissionRate: calculation.commissionRate,
          tier: calculation.tier,
        }),
      }
    })

    // Get rep and client names for notifications
    const [rep, client] = await Promise.all([
      prisma.user.findUnique({ where: { id: calculation.repId }, select: { name: true } }),
      prisma.client.findUnique({ where: { id: calculation.clientId }, select: { companyName: true } }),
    ])

    const repName = rep?.name || 'Unknown Rep'
    const companyName = client?.companyName || 'Unknown Company'

    // Notify rep
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Commission Earned',
        message: `You earned $${calculation.commissionAmount} on ${companyName} (${Math.round(calculation.commissionRate * 100)}%)`,
        metadata: {
          commissionId: commission.id,
          amount: calculation.commissionAmount,
          tier: calculation.tier,
        }
      }
    })

    // Notify admin
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Commission Created',
        message: `$${calculation.commissionAmount} commission to ${repName} for ${companyName}`,
        metadata: {
          commissionId: commission.id,
          repId: calculation.repId,
          amount: calculation.commissionAmount,
        }
      }
    })

    return commission
  } catch (error) {
    console.error('Commission creation error:', error)
    return null
  }
}

export async function processRevenueCommission(revenueId: string) {
  try {
    const revenue = await prisma.revenue.findUnique({
      where: { id: revenueId },
      include: {
        client: {
          include: {
            lead: {
              include: {
                assignedTo: true
              }
            }
          }
        }
      }
    })

    if (!revenue) return null

    // Gap 1: Use ownerRepId (dialer) OR assignedToId (original) for commission
    const lead = revenue.client?.lead
    const repUser = lead?.assignedTo
    const ownerRepId = (lead as any)?.ownerRepId as string | null

    // Handle unassigned leads — cannot create Commission with null repId
    if (!repUser && !ownerRepId) {
      const companyName = revenue.client?.companyName || 'Unknown Company'
      console.warn(`[Commission] No rep assigned for revenue ${revenueId} (${companyName}) — skipping commission`)

      // Notify admin so they can retroactively assign credit
      await prisma.notification.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: 'Payment — No Rep Assigned',
          message: `Payment of $${revenue.amount} received for ${companyName} — no rep assigned, no commission owed.`,
          metadata: {
            revenueId,
            clientId: revenue.clientId,
            amount: revenue.amount,
          },
        },
      })

      // Log event on the lead if available
      if (revenue.client?.lead?.id) {
        await prisma.leadEvent.create({
          data: {
            leadId: revenue.client.lead.id,
            eventType: 'PAYMENT_RECEIVED',
            metadata: {
              revenueId,
              amount: revenue.amount,
              noRepAssigned: true,
            },
          },
        })
      }

      return null
    }

    // Gap 1: Prefer ownerRepId (dialer-set) over assignedToId
    const repId = ownerRepId || repUser!.id
    const calculation = await calculateCommission({
      repId,
      clientId: revenue.clientId!,
      revenueType: revenue.type,
      amount: revenue.amount
    })

    if (calculation) {
      return await createCommission(calculation)
    }

    return null
  } catch (error) {
    console.error('Revenue commission processing error:', error)
    return null
  }
}

export async function getRepCommissionSummary(repId: string) {
  try {
    const [commissions, stats] = await Promise.all([
      prisma.commission.findMany({
        where: { repId },
        include: {
          client: { select: { companyName: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.commission.groupBy({
        by: ['status'],
        where: { repId },
        _sum: { amount: true },
        _count: true
      })
    ])

    const summary = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 }
    }

    stats.forEach(stat => {
      if (stat.status === 'PENDING') {
        summary.pending = { count: stat._count, amount: stat._sum.amount || 0 }
      } else if (stat.status === 'PAID') {
        summary.paid = { count: stat._count, amount: stat._sum.amount || 0 }
      }
    })

    summary.total = {
      count: summary.pending.count + summary.paid.count,
      amount: summary.pending.amount + summary.paid.amount
    }

    return { commissions, summary }
  } catch (error) {
    console.error('Rep commission summary error:', error)
    return null
  }
}

export async function markCommissionPaid(commissionId: string, paidAt?: Date) {
  try {
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paidAt: paidAt || new Date()
      },
      include: {
        rep: { select: { name: true, email: true } }
      }
    })

    // Notify rep
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED', // Use existing type
        title: 'Commission Paid',
        message: `Your $${commission.amount} commission has been paid`,
        metadata: { commissionId: commission.id }
      }
    })

    return commission
  } catch (error) {
    console.error('Mark commission paid error:', error)
    return null
  }
}