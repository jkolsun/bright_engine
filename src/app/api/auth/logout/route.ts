import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 * Clears the session cookie and logs out the user
 * Returns: { success: true, redirectUrl: '/login' }
 */
export async function POST(request: NextRequest) {
  try {
    // Create response with redirect
    const response = NextResponse.json(
      { success: true, redirectUrl: '/login' },
      { status: 200 }
    )

    // Clear session cookie
    response.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0 // This expires the cookie immediately
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    )
  }
}
