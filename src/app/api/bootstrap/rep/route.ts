import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/bootstrap/rep
 * Create rep user (can create multiple)
 * Body: { email, name, phone }
 */
export async function POST(request: NextRequest) {
  try {
    const { email, name, phone } = await request.json()

    if (!email || !name || !phone) {
      return NextResponse.json(
        { error: 'email, name, and phone required' },
        { status: 400 }
      )
    }

    // Check if rep already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return NextResponse.json(
        {
          error: 'Rep already exists',
          email: existing.email,
          name: existing.name,
        },
        { status: 409 }
      )
    }

    // Create rep user
    const rep = await prisma.user.create({
      data: {
        email,
        name,
        role: 'REP',
        status: 'ACTIVE',
        phone,
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Rep created successfully',
      rep: {
        id: rep.id,
        email: rep.email,
        name: rep.name,
        role: rep.role,
        phone: rep.phone,
      },
      nextSteps: [
        '1. Rep is now active and can be assigned leads',
        '2. Go to dashboard to assign leads to this rep',
        '3. Rep can log in at /login with their email (password: their email until updated)',
      ]
    })
  } catch (error) {
    console.error('Bootstrap rep error:', error)
    return NextResponse.json(
      { error: 'Failed to create rep', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
