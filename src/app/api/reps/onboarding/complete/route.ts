import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession, signSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = await verifySession(sessionCookie)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Mark onboarding as complete
    await prisma.user.update({
      where: { id: decoded.userId },
      data: {
        onboardingComplete: true,
        onboardingCompletedAt: new Date(),
      },
    })

    // Fetch the full user to build updated session payload
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Re-sign the session cookie with updated payload
    const sessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      portalType: user.portalType,
      onboardingCompletedAt: user.onboardingCompletedAt,
      iat: Date.now(),
    }

    const sessionData = await signSession(sessionPayload)

    const response = NextResponse.json({ success: true })
    response.cookies.set({
      name: 'session',
      value: sessionData,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
