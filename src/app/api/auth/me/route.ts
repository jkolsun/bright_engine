import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 * Returns the currently authenticated user from the session cookie
 * Used by rep dashboard and other pages to know who's logged in
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify signed session cookie
    const decoded = await verifySession(sessionCookie)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get user from database + onboarding setting in parallel
    const [user, onboardingSetting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          status: true,
          portalType: true,
          dailyLeadCap: true,
          onboardingComplete: true,
          onboardingCompletedAt: true,
          outboundVmUrl: true,
          outboundVmApproved: true,
          inboundVmUrl: true,
          inboundVmApproved: true,
        },
      }),
      prisma.settings.findUnique({ where: { key: 'rep_onboarding_enabled' } }),
    ])

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user,
      repOnboardingEnabled: onboardingSetting?.value !== false,
    })
  } catch (error) {
    console.error('Auth /me error:', error)
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    )
  }
}
