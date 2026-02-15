import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { signSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/simple-login
 * Login with email + password
 * Validates against bcrypt passwordHash with auto-migration for legacy passwords
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

    // Validate password (with bcrypt if hash exists, else default password + auto-migrate)
    const defaultPassword = process.env.DEFAULT_LOGIN_PASSWORD || '123456'
    if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }
    } else {
      // No hash yet - check against default password
      if (password !== defaultPassword) {
        return NextResponse.json(
          { success: false, error: 'Invalid credentials' },
          { status: 401 }
        )
      }
      // Auto-migrate: hash the password for next login (non-blocking, background task)
      // Fire-and-forget: don't block login on migration failure
      const migratePassword = async () => {
        try {
          const hash = await bcrypt.hash(password, 10)
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash }
          })
          console.log(`Password hash migrated for user ${user.email}`)
        } catch (err) {
          console.error(`Failed to migrate password hash for user ${user.id}:`, err)
          // Silently fail - login already succeeded, migration can happen on next login
        }
      }
      // Start migration without awaiting
      void migratePassword()
    }

    // Determine redirect URL based on user role
    const redirectUrl = user.role === 'ADMIN' ? '/admin/dashboard' : '/reps'

    // Create response with redirect
    const response = NextResponse.json(
      { success: true, redirectUrl },
      { status: 200 }
    )

    // Set session cookie (HMAC signed)
    const sessionData = signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: Date.now()
    })
    
    response.cookies.set({
      name: 'session',
      value: sessionData,
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
