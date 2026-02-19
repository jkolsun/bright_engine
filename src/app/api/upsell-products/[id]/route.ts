import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/upsell-products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const product = await prisma.upsellProduct.findUnique({
      where: { id: params.id },
      include: { pitches: { orderBy: { pitchedAt: 'desc' }, take: 50 } }
    })

    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// PUT /api/upsell-products/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()
    const product = await prisma.upsellProduct.update({
      where: { id: params.id },
      data: {
        name: data.name,
        price: data.price,
        recurring: data.recurring,
        stripeLink: data.stripeLink,
        active: data.active,
        isCore: data.isCore,
        month1Price: data.month1Price,
        recurringPrice: data.recurringPrice,
        annualPrice: data.annualPrice,
        stripeLinkAnnual: data.stripeLinkAnnual,
        pitchOneLiner: data.pitchOneLiner,
        previewBannerText: data.previewBannerText,
        repCloseScript: data.repCloseScript,
        description: data.description,
        aiPitchInstructions: data.aiPitchInstructions,
        aiProductSummary: data.aiProductSummary,
        eligibleIndustries: data.eligibleIndustries || [],
        minClientAgeDays: data.minClientAgeDays,
        maxPitchesPerClient: data.maxPitchesPerClient,
        pitchChannel: data.pitchChannel,
        sortOrder: data.sortOrder,
      }
    })

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/upsell-products/[id] — Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const product = await prisma.upsellProduct.update({
      where: { id: params.id },
      data: { active: false }
    })

    return NextResponse.json({ product, message: 'Deactivated' })
  } catch (error) {
    console.error('Error deactivating product:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
