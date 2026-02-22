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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

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

    // Validate onboardingComplete: only allow setting to true if ALL conditions met
    if (updateData.onboardingComplete === true) {
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          name: true,
          personalPhone: true,
          availableHours: true,
          agreedToTermsAt: true,
        },
      })

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const missing: string[] = []

      // 1. Name must be set
      const finalName = updateData.name ?? existingUser.name
      if (!finalName || !String(finalName).trim()) missing.push('name')

      // 2. Personal phone must be set and valid
      const finalPhone = updateData.personalPhone ?? existingUser.personalPhone
      if (!finalPhone || String(finalPhone).replace(/\D/g, '').length < 10) missing.push('personalPhone')

      // 3. Available hours must have at least 1 active day
      const finalHours = updateData.availableHours ?? existingUser.availableHours
      if (!finalHours || typeof finalHours !== 'object' || !Object.values(finalHours).some((d: any) => d?.active)) {
        missing.push('availableHours')
      }

      // 4. Terms must be agreed (Stripe is optional — reps can connect later)
      const termsAgreed = updateData.agreedToTermsAt || existingUser.agreedToTermsAt
      if (!termsAgreed) missing.push('agreedToTermsAt')

      if (missing.length > 0) {
        return NextResponse.json(
          { error: 'Incomplete onboarding', missing },
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
