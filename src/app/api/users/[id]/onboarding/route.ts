import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/users/[id]/onboarding — Returns rep onboarding state
 * Auth: rep can read own, admin can read any
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    // Rep can only read own onboarding, admin can read any
    if (session.role !== 'ADMIN' && session.userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        phone: true,
        personalPhone: true,
        email: true,
        timezone: true,
        availableHours: true,
        commissionRate: true,
        stripeConnectId: true,
        stripeConnectStatus: true,
        agreedToTermsAt: true,
        onboardingComplete: true,
        portalType: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching onboarding state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding state' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/users/[id]/onboarding — Updates onboarding fields
 * Auth: rep can update own, admin can update any
 * Accepts: name, personalPhone, timezone, availableHours, agreedToTermsAt, onboardingComplete
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = params

    // Rep can only update own onboarding, admin can update any
    if (session.role !== 'ADMIN' && session.userId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const allowedFields = ['name', 'personalPhone', 'timezone', 'availableHours', 'agreedToTermsAt', 'onboardingComplete']
    const updateData: Record<string, any> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Validate personalPhone: strip non-digits, must be 10+ digits
    if (updateData.personalPhone !== undefined) {
      const digits = String(updateData.personalPhone).replace(/\D/g, '')
      if (digits.length < 10) {
        return NextResponse.json(
          { error: 'Personal phone must be at least 10 digits' },
          { status: 400 }
        )
      }
      updateData.personalPhone = digits
    }

    // Validate availableHours: at least 1 day must have active: true
    if (updateData.availableHours !== undefined) {
      const hours = updateData.availableHours
      if (typeof hours === 'object' && hours !== null) {
        const hasActiveDay = Object.values(hours).some(
          (day: any) => day && day.active === true
        )
        if (!hasActiveDay) {
          return NextResponse.json(
            { error: 'At least one day must be marked as active in availableHours' },
            { status: 400 }
          )
        }
      }
    }

    // Validate onboardingComplete: only allow setting to true if stripe + terms conditions met
    if (updateData.onboardingComplete === true) {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { stripeConnectStatus: true, agreedToTermsAt: true },
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Check stripe status from DB or incoming data
      const stripeStatus = existingUser.stripeConnectStatus
      const stripeOk = stripeStatus === 'active' || stripeStatus === 'pending'

      // Check agreedToTermsAt from incoming data or DB
      const termsAgreed = updateData.agreedToTermsAt || existingUser.agreedToTermsAt

      if (!stripeOk) {
        return NextResponse.json(
          { error: 'Stripe Connect must be active or pending to complete onboarding' },
          { status: 400 }
        )
      }

      if (!termsAgreed) {
        return NextResponse.json(
          { error: 'Terms must be agreed to before completing onboarding' },
          { status: 400 }
        )
      }
    }

    // Convert agreedToTermsAt string to Date if provided
    if (updateData.agreedToTermsAt && typeof updateData.agreedToTermsAt === 'string') {
      updateData.agreedToTermsAt = new Date(updateData.agreedToTermsAt)
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        personalPhone: true,
        email: true,
        timezone: true,
        availableHours: true,
        commissionRate: true,
        stripeConnectId: true,
        stripeConnectStatus: true,
        agreedToTermsAt: true,
        onboardingComplete: true,
        portalType: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding' },
      { status: 500 }
    )
  }
}
