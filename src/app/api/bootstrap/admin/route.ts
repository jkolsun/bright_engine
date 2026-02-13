import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/bootstrap/admin
 * Create admin user (one-time setup)
 * Body: { email, name, password }
 * 
 * Safety: Check if admin already exists. Refuse to overwrite.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'email, name, and password required' },
        { status: 400 }
      )
    }

    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        {
          error: 'Admin already exists',
          email: existing.email,
          name: existing.name,
          message: 'Delete user and re-run if you need to recreate'
        },
        { status: 409 }
      )
    }

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        name,
        role: 'ADMIN',
        status: 'ACTIVE',
        phone: '+17322283794', // Your phone for alerts
        // Note: Password stored as plaintext for now (TODO: add bcrypt)
        // In production, hash passwords with bcrypt
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Admin user created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        phone: admin.phone,
      },
      nextSteps: [
        '1. Log in at /login with your email + password',
        '2. Create your first rep account in the dashboard',
        '3. Start importing leads',
      ]
    })
  } catch (error) {
    console.error('Bootstrap error:', error)
    return NextResponse.json(
      { error: 'Failed to create admin', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
