import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/referrals - List referrals
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const referrals = await prisma.referral.findMany({
      include: {
        referrerClient: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const stats = {
      totalLinks: await prisma.client.count({ where: { referralCode: { not: null } } }),
      thisMonth: referrals.filter(r => {
        const now = new Date()
        const created = new Date(r.createdAt)
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
      }).length,
      converted: referrals.filter(r => r.status === 'closed').length,
      creditsIssued: referrals.filter(r => r.creditApplied).reduce((sum, r) => sum + r.creditAmount, 0),
    }

    return NextResponse.json({ referrals, stats })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

// POST /api/referrals - Create referral
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const referral = await prisma.referral.create({
      data: {
        referrerClientId: data.referrerClientId,
        referredName: data.referredName,
        referredPhone: data.referredPhone,
        referredEmail: data.referredEmail,
        referredCompany: data.referredCompany,
        status: data.status || 'pending',
      }
    })

    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }
}