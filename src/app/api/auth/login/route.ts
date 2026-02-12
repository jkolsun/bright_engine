import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Simple auth for MVP - in production use proper hashing
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Check if this is the admin login from env
      if (
        email === process.env.ADMIN_EMAIL &&
        password === process.env.ADMIN_PASSWORD
      ) {
        // Create admin user if doesn't exist
        const admin = await prisma.user.upsert({
          where: { email: process.env.ADMIN_EMAIL! },
          update: {},
          create: {
            email: process.env.ADMIN_EMAIL!,
            name: 'Andrew',
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        })

        return NextResponse.json({
          success: true,
          role: admin.role,
          user: { id: admin.id, name: admin.name, email: admin.email },
        })
      }

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // For demo: accept any password for existing users
    // In production, verify hashed password
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Account inactive' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      user: { id: user.id, name: user.name, email: user.email },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
