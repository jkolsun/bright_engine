import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/reps - List reps with stats
export async function GET(request: NextRequest) {
  try {
    const reps = await prisma.user.findMany({
      where: { role: 'REP' },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedLeads: {
          select: { id: true }
        },
        commissions: {
          where: { status: 'PAID' },
          select: { amount: true }
        },
        activities: {
          select: { id: true }
        }
      }
    })

    // Calculate stats for each rep
    const repsWithStats = await Promise.all(
      reps.map(async (rep) => {
        // Get current month activity
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        firstDayOfMonth.setHours(0, 0, 0, 0)

        const monthActivity = await prisma.repActivity.aggregate({
          where: {
            repId: rep.id,
            date: { gte: firstDayOfMonth }
          },
          _sum: {
            dials: true,
            conversations: true,
            previewLinksSent: true,
            closes: true,
            commissionEarned: true
          }
        })

        // Get all-time closes
        const totalCloses = await prisma.lead.count({
          where: {
            assignedToId: rep.id,
            status: 'PAID'
          }
        })

        // Get total commissions
        const totalCommissions = rep.commissions.reduce(
          (sum, comm) => sum + comm.amount,
          0
        )

        return {
          id: rep.id,
          name: rep.name,
          email: rep.email,
          phone: rep.phone,
          status: rep.status,
          createdAt: rep.createdAt,
          stats: {
            assignedLeads: rep.assignedLeads.length,
            totalCloses,
            totalCommissions,
            monthActivity: {
              dials: monthActivity._sum.dials || 0,
              conversations: monthActivity._sum.conversations || 0,
              previewLinksSent: monthActivity._sum.previewLinksSent || 0,
              closes: monthActivity._sum.closes || 0,
              commissionEarned: monthActivity._sum.commissionEarned || 0
            }
          }
        }
      })
    )

    // Sort by month closes (leaderboard)
    repsWithStats.sort((a, b) => 
      b.stats.monthActivity.closes - a.stats.monthActivity.closes
    )

    return NextResponse.json({ reps: repsWithStats })
  } catch (error) {
    console.error('Error fetching reps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reps' },
      { status: 500 }
    )
  }
}

// POST /api/reps - Create rep
export async function POST(request: NextRequest) {
  try {
    const { name, email, phone } = await request.json()

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email' },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const rep = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: 'REP',
        status: 'ACTIVE'
      }
    })

    return NextResponse.json({ rep })
  } catch (error) {
    console.error('Error creating rep:', error)
    return NextResponse.json(
      { error: 'Failed to create rep' },
      { status: 500 }
    )
  }
}
