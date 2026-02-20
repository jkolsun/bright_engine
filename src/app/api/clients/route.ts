import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { getPricingConfig } from '@/lib/pricing-config'

export const dynamic = 'force-dynamic'

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }
    const data = await request.json()
    const config = await getPricingConfig()

    // Generate referral code
    const referralCode = `BA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        siteUrl: data.websiteUrl || data.siteUrl,
        industry: data.industry || 'GENERAL_CONTRACTING',
        location: data.location,
        hostingStatus: 'ACTIVE',
        monthlyRevenue: data.monthlyRevenue || config.monthlyHosting,
        plan: data.plan || 'base',
        leadId: data.leadId,
        repId: data.repId,
        referralCode,
        tags: data.tags || [],
        notes: data.notes,
        closedDate: new Date(),
      }
    })

    // Create analytics record
    await prisma.clientAnalytics.create({
      data: { clientId: client.id }
    })

    // Log site build payment to revenue
    await prisma.revenue.create({
      data: {
        clientId: client.id,
        amount: data.siteBuildFee || config.siteBuildFee,
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
        amount: data.monthlyRevenue || config.monthlyHosting,
        type: 'HOSTING_MONTHLY',
        product: 'Monthly Hosting',
        status: 'PENDING',
        recurring: true,
      }
    })

    return NextResponse.json({ client })
  } catch (error: any) {
    console.error('Error creating client:', error)
    const message = error?.message || 'Unknown error'
    return NextResponse.json({ error: 'Failed to create client', detail: message }, { status: 500 })
  }
}

// GET /api/clients - List clients with filters
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '200')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = { deletedAt: null }
    if (status) where.hostingStatus = status
    if (tag) where.tags = { has: tag }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

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
              city: true,
              state: true,
              enrichedRating: true,
              enrichedReviews: true,
            }
          },
          rep: {
            select: {
              id: true,
              name: true,
            }
          },
          analytics: true,
          editRequests: {
            where: { status: { in: ['new', 'ai_processing', 'ready_for_review'] } },
            select: { id: true, status: true },
          },
          _count: {
            select: {
              editRequests: true,
              messages: true,
            }
          }
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
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}