import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/upsell-products - List all upsell products
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const products = await prisma.upsellProduct.findMany({
      where: { deletedAt: null },
      include: {
        pitches: {
          select: {
            id: true,
            clientId: true,
            status: true,
            pitchedAt: true,
            paidAt: true,
          }
        }
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching upsell products:', error)
    return NextResponse.json({ error: 'Failed to fetch upsell products' }, { status: 500 })
  }
}

// POST /api/upsell-products - Create upsell product
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const product = await prisma.upsellProduct.create({
      data: {
        name: data.name,
        price: data.price,
        recurring: data.recurring ?? true,
        stripeLink: data.stripeLink,
        active: data.active ?? true,
        isCore: data.isCore ?? false,
        month1Price: data.month1Price || null,
        recurringPrice: data.recurringPrice || null,
        annualPrice: data.annualPrice || null,
        stripeLinkAnnual: data.stripeLinkAnnual || null,
        pitchOneLiner: data.pitchOneLiner || null,
        previewBannerText: data.previewBannerText || null,
        repCloseScript: data.repCloseScript || null,
        description: data.description || null,
        aiPitchInstructions: data.aiPitchInstructions || null,
        aiProductSummary: data.aiProductSummary || null,
        eligibleIndustries: data.eligibleIndustries || [],
        minClientAgeDays: data.minClientAgeDays || null,
        maxPitchesPerClient: data.maxPitchesPerClient ?? 3,
        pitchChannel: data.pitchChannel || 'sms',
        sortOrder: data.sortOrder ?? 0,
      }
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error creating upsell product:', error)
    return NextResponse.json({ error: 'Failed to create upsell product' }, { status: 500 })
  }
}