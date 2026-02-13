import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Decode session cookie
    const decoded = JSON.parse(
      Buffer.from(sessionCookie, 'base64').toString()
    )

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth /me error:', error)
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    )
  }
}
