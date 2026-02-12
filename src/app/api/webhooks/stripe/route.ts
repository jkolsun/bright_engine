import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { handleWebhook } from '@/lib/stripe'
import { prisma } from '@/lib/db'

// POST /api/webhooks/stripe - Handle Stripe events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    await handleWebhook(body, signature)

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    
    // Log failed webhook for retry
    await prisma.failedWebhook.create({
      data: {
        source: 'stripe',
        payload: { error: (error as Error).message },
        error: (error as Error).message,
      }
    })

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 400 }
    )
  }
}
