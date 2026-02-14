import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }
    const data = await request.json()

    // Create client
    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        siteUrl: data.websiteUrl || data.siteUrl,
        industry: data.industry || 'GENERAL_CONTRACTING',
        hostingStatus: 'ACTIVE',
        monthlyRevenue: data.monthlyRevenue || 39,
        leadId: data.leadId, // Optional - if converting from lead
      }
    })

    // Create analytics record
    await prisma.clientAnalytics.create({
      data: {
        clientId: client.id,
      }
    })

    // Log site build payment to revenue
    await prisma.revenue.create({
      data: {
        clientId: client.id,
        amount: data.siteBuildFee || 149,
        type: 'SITE_BUILD',
        product: 'Website Setup',
        status: 'PENDING',
        recurring: false,
      }
    })

    // Log monthly hosting to revenue
    await prisma.revenue.create({
      data: {
        clientId: client.id,
        amount: data.monthlyRevenue || 39,
        type: 'HOSTING_MONTHLY',
        product: 'Monthly Hosting',
        status: 'PENDING',
        recurring: true,
      }
    })

    return NextResponse.json({ client })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}

// GET /api/clients - List clients with filters
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const where: any = {}
  if (status) where.hostingStatus = status

  try {
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              industry: true,
            }
          },
          analytics: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.client.count({ where })
    ])

    return NextResponse.json({ clients, total, limit, offset })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}
