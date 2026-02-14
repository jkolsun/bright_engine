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
    const baseRate = 0.5 // TODO: Add commissionRate field to User model

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

    // Adjust rate based on revenue type
    let typeMultiplier = 1
    if (revenueType === 'HOSTING_MONTHLY') {
      typeMultiplier = 0.3 // Lower rate for recurring
    } else if (revenueType === 'UPSELL') {
      typeMultiplier = 0.6 // Higher rate for upsells
    }

    const finalRate = baseRate * rateMultiplier * typeMultiplier
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
    const commission = await prisma.commission.create({
      data: {
        repId: calculation.repId,
        clientId: calculation.clientId,
        type: 'SITE_BUILD', // Use existing enum value
        amount: calculation.commissionAmount,
        status: 'PENDING'
      }
    })

    // Create notification for rep
    await prisma.notification.create({
      data: {
        type: 'PAYMENT_RECEIVED', // Use existing type
        title: 'Commission Earned',
        message: `You earned $${calculation.commissionAmount} commission (${Math.round(calculation.commissionRate * 100)}%)`,
        metadata: {
          commissionId: commission.id,
          amount: calculation.commissionAmount,
          tier: calculation.tier
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

    if (!revenue?.client?.lead?.assignedTo) {
      return null
    }

    const repId = revenue.client.lead.assignedTo.id
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