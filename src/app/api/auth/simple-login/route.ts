import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/auth/simple-login
 * Simple login: email + password
 * Returns: { success, redirectUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Hardcoded credentials for now
    const validCredentials = {
      'admin@brightautomations.net': '123456',
      'andrew@brightautomations.net': '123456',
    }

    if (!validCredentials[email as keyof typeof validCredentials] || validCredentials[email as keyof typeof validCredentials] !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create response with redirect
    const response = NextResponse.json(
      { success: true, redirectUrl: '/admin/dashboard' },
      { status: 200 }
    )

    // Set session cookie (simple JWT)
    const sessionData = JSON.stringify({ email, role: 'ADMIN', iat: Date.now() })
    const sessionB64 = Buffer.from(sessionData).toString('base64')
    
    response.cookies.set({
      name: 'session',
      value: sessionB64,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
