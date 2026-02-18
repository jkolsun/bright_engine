import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/edit-requests - List edit requests with filters
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = {}
    if (status) where.status = status
    if (clientId) where.clientId = clientId

    const [editRequests, total] = await Promise.all([
      prisma.editRequest.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              siteUrl: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.editRequest.count({ where })
    ])

    return NextResponse.json({ editRequests, total })
  } catch (error) {
    console.error('Error fetching edit requests:', error)
    return NextResponse.json({ error: 'Failed to fetch edit requests' }, { status: 500 })
  }
}

// POST /api/edit-requests - Create edit request
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const editRequest = await prisma.editRequest.create({
      data: {
        clientId: data.clientId,
        requestText: data.requestText,
        requestChannel: data.requestChannel || 'sms',
        aiInterpretation: data.aiInterpretation,
        complexityTier: data.complexityTier || 'medium',
        status: data.status || 'new',
        imageUrls: data.imageUrls,
      }
    })

    return NextResponse.json({ editRequest })
  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json({ error: 'Failed to create edit request' }, { status: 500 })
  }
}