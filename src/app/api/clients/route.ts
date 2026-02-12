import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Create client
    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        websiteUrl: data.websiteUrl,
        industry: data.industry,
        hostingStatus: 'ACTIVE',
        billingStatus: 'TRIAL',
        planType: data.planType || 'BASIC',
        monthlyPrice: data.monthlyPrice || 39,
        setupFee: data.setupFee || 0,
        leadId: data.leadId, // Optional - if converting from lead
      }
    })

    // Create analytics record
    await prisma.clientAnalytics.create({
      data: {
        clientId: client.id,
      }
    })

    // Log to revenue if setup fee
    if (data.setupFee && data.setupFee > 0) {
      await prisma.revenue.create({
        data: {
          clientId: client.id,
          amount: data.setupFee,
          type: 'SETUP',
          status: 'PENDING',
          description: 'Website setup fee',
        }
      })
    }

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
