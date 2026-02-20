import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/upsell-products/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const product = await prisma.upsellProduct.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

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

// DELETE /api/upsell-products/[id] — Soft delete (sets deletedAt + deactivates)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Check for existing pitches
    const pitchCount = await prisma.upsellPitch.count({ where: { productId: id } })

    if (pitchCount > 0) {
      // Soft delete — has historical pitch data
      await prisma.upsellProduct.update({
        where: { id },
        data: { deletedAt: new Date(), active: false },
      })
    } else {
      // No pitches — safe to hard delete
      await prisma.upsellProduct.delete({ where: { id } })
    }

    // Clean up clientSequences settings JSON to remove this product
    try {
      const settingsRow = await prisma.settings.findUnique({ where: { key: 'client_sequences' } })
      if (settingsRow?.value && typeof settingsRow.value === 'object') {
        const sequences = settingsRow.value as any
        if (sequences.upsellProducts && Array.isArray(sequences.upsellProducts)) {
          sequences.upsellProducts = sequences.upsellProducts.filter(
            (p: any) => p.id !== id && p.key !== id
          )
          await prisma.settings.update({
            where: { key: 'client_sequences' },
            data: { value: sequences },
          })
        }
      }
    } catch {
      // Non-fatal — settings cleanup is best effort
    }

    return NextResponse.json({ success: true, message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}