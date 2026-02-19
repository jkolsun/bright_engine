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

    const productId = params.id
    if (!productId) {
      return NextResponse.json({ error: 'Missing product ID' }, { status: 400 })
    }

    const data = await request.json()

    // Only include fields that are explicitly provided (not undefined)
    const updateData: Record<string, unknown> = {}
    const fields = [
      'name', 'price', 'recurring', 'stripeLink', 'active', 'isCore',
      'month1Price', 'recurringPrice', 'annualPrice', 'stripeLinkAnnual',
      'pitchOneLiner', 'previewBannerText', 'repCloseScript',
      'description', 'aiPitchInstructions', 'aiProductSummary',
      'minClientAgeDays', 'maxPitchesPerClient', 'pitchChannel', 'sortOrder',
    ]
    // Fields where empty string should become null (optional URL/text fields)
    const nullableFields = new Set([
      'stripeLink', 'stripeLinkAnnual', 'pitchOneLiner', 'previewBannerText',
      'repCloseScript', 'description', 'aiPitchInstructions', 'aiProductSummary',
    ])
    for (const field of fields) {
      if (field in data) {
        const val = data[field]
        updateData[field] = nullableFields.has(field) && (val === '' || val === undefined) ? null : val
      }
    }
    // Always default eligibleIndustries to [] if provided
    if ('eligibleIndustries' in data) {
      updateData.eligibleIndustries = data.eligibleIndustries || []
    }

    const product = await prisma.upsellProduct.update({
      where: { id: productId },
      data: updateData,
    })

    return NextResponse.json({ product })
  } catch (error: any) {
    console.error('Error updating product:', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update product' },
      { status: 500 }
    )
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
