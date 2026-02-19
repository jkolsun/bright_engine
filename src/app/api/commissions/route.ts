import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/commissions - List commissions
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const repId = searchParams.get('repId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (status) where.status = status

    // Reps can only see their own commissions
    if (session.role === 'ADMIN') {
      if (repId) where.repId = repId
    } else {
      where.repId = session.userId
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        rep: {
          select: { id: true, name: true, email: true }
        },
        client: {
          select: { id: true, companyName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ commissions })
  } catch (error) {
    console.error('Error fetching commissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commissions' },
      { status: 500 }
    )
  }
}

// POST /api/commissions - Create commission (admin only)
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const commission = await prisma.commission.create({
      data: {
        repId: data.repId,
        clientId: data.clientId,
        type: data.type || 'SITE_BUILD',
        amount: data.amount,
        status: 'PENDING'
      }
    })

    return NextResponse.json({ commission })
  } catch (error) {
    console.error('Error creating commission:', error)
    return NextResponse.json(
      { error: 'Failed to create commission' },
      { status: 500 }
    )
  }
}
