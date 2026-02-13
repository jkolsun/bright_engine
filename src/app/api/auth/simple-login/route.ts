import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/auth/simple-login
 * Simple login: email + password
 * Queries database for user, validates against hardcoded password for now
 * TODO: Implement proper password hashing (bcrypt) and store in database
 * Returns: { success, redirectUrl }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Query database for user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // TODO: Replace with proper password hash comparison using bcrypt
    // For now, use environment variable or hardcoded temporary password
    const defaultPassword = process.env.DEFAULT_LOGIN_PASSWORD || '123456'
    
    if (password !== defaultPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Determine redirect URL based on user role
    const redirectUrl = user.role === 'ADMIN' ? '/admin/dashboard' : '/reps'

    // Create response with redirect
    const response = NextResponse.json(
      { success: true, redirectUrl },
      { status: 200 }
    )

    // Set session cookie (simple JWT)
    const sessionData = JSON.stringify({ 
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Date.now()
    })
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
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
