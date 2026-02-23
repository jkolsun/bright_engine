export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { dispatchWebhook } from '@/lib/webhook-dispatcher'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, productId, callId } = await request.json()

    if (!leadId || !productId) {
      return NextResponse.json({ error: 'leadId and productId are required' }, { status: 400 })
    }

    const product = await prisma.upsellProduct.findUnique({
      where: { id: productId },
      select: { name: true, price: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const tag = await prisma.upsellTag.create({
      data: {
        leadId,
        productId,
        addedByRepId: session.userId,
        callId: callId || undefined,
        productName: product.name,
        productPrice: product.price,
      },
    })

    dispatchWebhook({
      type: 'dialer.upsell_tagged',
      data: { leadId, productId, productName: product.name, repId: session.userId },
    }).catch(err => console.error('[DialerUpsell] Webhook dispatch failed:', err))

    return NextResponse.json(tag)
  } catch (error) {
    console.error('[Dialer Upsell Tag API] POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
