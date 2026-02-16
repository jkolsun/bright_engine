import { NextRequest, NextResponse } from 'next/server'
import { handleInstantlyWebhook } from '@/lib/instantly'

export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/instantly
 * Webhook handler for Instantly events (replies, bounces, unsubscribes, opens, clicks)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Validate webhook signature (optional — Instantly may not require it)
    // For now, we'll just process all incoming webhooks

    // Handle the webhook
    await handleInstantlyWebhook(payload)

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Instantly webhook error:', error)
    // Always return 200 so Instantly doesn't retry indefinitely
    // Log the error for manual review
    return NextResponse.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 200 })
  }
}
