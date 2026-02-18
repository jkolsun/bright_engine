import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/upsell-pitches - List upsell pitches with stats
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')

    const where: any = {}
    if (clientId) where.clientId = clientId
    if (status) where.status = status

    const pitches = await prisma.upsellPitch.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { pitchedAt: 'desc' },
    })

    // Calculate pipeline stats
    const stats = {
      pitched: pitches.length,
      opened: pitches.filter(p => p.status === 'opened' || p.openedAt).length,
      clicked: pitches.filter(p => p.status === 'clicked' || p.clickedAt).length,
      paid: pitches.filter(p => p.status === 'paid').length,
      revenueAdded: pitches
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.product.recurring ? p.product.price : 0), 0),
    }

    return NextResponse.json({ pitches, stats })
  } catch (error) {
    console.error('Error fetching upsell pitches:', error)
    return NextResponse.json({ error: 'Failed to fetch upsell pitches' }, { status: 500 })
  }
}

// POST /api/upsell-pitches - Create upsell pitch
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const pitch = await prisma.upsellPitch.create({
      data: {
        clientId: data.clientId,
        productId: data.productId,
        pitchChannel: data.pitchChannel || 'sms',
        sequenceDay: data.sequenceDay,
        status: 'pitched',
      }
    })

    return NextResponse.json({ pitch })
  } catch (error) {
    console.error('Error creating upsell pitch:', error)
    return NextResponse.json({ error: 'Failed to create upsell pitch' }, { status: 500 })
  }
}