import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// GET /api/users - List users/reps
export async function GET(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    
    const where: any = {}
    if (role) where.role = role

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new rep/user
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role || 'REP',
        status: 'ACTIVE'
      }
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
