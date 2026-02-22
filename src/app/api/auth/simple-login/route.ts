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
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Wrap entire handler with 10-second timeout
    return await Promise.race([
      handleLogin(request) as Promise<Response>,
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Login handler timeout')), 10000)
      )
    ])
  } catch (error) {
    console.error('Login timeout:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}

async function handleLogin(request: NextRequest): Promise<Response> {
  try {
    // Parse JSON request with timeout
    const parsePromise = request.json()
    const parseTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request parse timeout')), 5000)
    )
    const body = await Promise.race([parsePromise, parseTimeout]) as any
    const email = body?.email || ''
    const password = body?.password || ''

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      )
    }

    // Query database for user with timeout
    const queryPromise = prisma.user.findUnique({
      where: { email }
    })
    const queryTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 5000)
    )
    const user = await Promise.race([queryPromise, queryTimeout]) as any

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Validate password (with bcrypt if hash exists, else default password + auto-migrate)
    const defaultPassword = process.env.DEFAULT_LOGIN_PASSWORD || '123456'
    if (user.passwordHash) {
      const comparePromise = bcrypt.compare(password, user.passwordHash)
      const compareTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Password comparison timeout')), 5000)
      )
      const valid = await Promise.race([comparePromise, compareTimeout]) as boolean
      
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
          const hashPromise = bcrypt.hash(password, 10)
          const hashTimeout = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Bcrypt hash timeout')), 5000)
          )
          const hash = await Promise.race([hashPromise, hashTimeout])
          
          const updatePromise = prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hash }
          })
          const updateTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Update timeout')), 5000)
          )
          await Promise.race([updatePromise, updateTimeout])
          
          console.log(`Password hash migrated for user ${user.email}`)
        } catch (err) {
          console.error(`Failed to migrate password hash for user ${user.id}:`, err)
          // Silently fail - login already succeeded, migration can happen on next login
        }
      }
      // Start migration without awaiting
      void migratePassword()
    }

    // Update lastSeenAt for briefing tracking (fire-and-forget)
    void prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    }).catch(() => {})

    // Determine redirect URL based on user role and portal type
    const redirectUrl = user.role === 'ADMIN'
      ? '/admin/dashboard'
      : user.portalType === 'PART_TIME' ? '/part-time' : '/reps'

    // Create response with redirect
    const response = NextResponse.json(
      { success: true, redirectUrl },
      { status: 200 }
    )

    // Set session cookie (HMAC signed) with timeout
    const signPromise = signSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      portalType: user.portalType || 'FULL',
      onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() || null,
      iat: Date.now()
    })
    const signTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session signing timeout')), 5000)
    )
    const sessionData = await Promise.race([signPromise, signTimeout]) as string
    
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
    console.error('Login handler error:', error)
    return NextResponse.json(
      { success: false, error: 'Login failed' },
      { status: 500 }
    )
  }
}
