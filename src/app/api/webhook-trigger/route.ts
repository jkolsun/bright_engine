import { NextRequest, NextResponse } from 'next/server'
import { dispatchWebhook, WebhookEvents } from '@/lib/webhook-dispatcher'

// POST /api/webhook-trigger - Manual webhook testing/triggering (API key auth)
export async function POST(request: NextRequest) {
  // Require API key authentication
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!apiKey || apiKey !== process.env.CLAWDBOT_API_KEY) {
    return NextResponse.json({ error: 'Invalid API key - use CLAWDBOT_API_KEY' }, { status: 401 })
  }
  try {
    const { eventType, data } = await request.json()

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    let event
    
    // Create event based on type
    switch (eventType) {
      case 'daily_digest':
        event = WebhookEvents.DAILY_DIGEST_REQUESTED(data?.requestedBy || 'manual')
        break
        
      case 'hot_engagement':
        if (!data?.leadId || !data?.eventType || !data?.urgencyScore) {
          return NextResponse.json({ error: 'Missing required data for hot_engagement' }, { status: 400 })
        }
        event = WebhookEvents.HOT_ENGAGEMENT(data.leadId, data.eventType, data.urgencyScore, data.metadata)
        break
        
      case 'system_alert':
        event = WebhookEvents.SYSTEM_ALERT(
          data?.level || 'info',
          data?.message || 'Test system alert',
          data?.metadata
        )
        break
        
      case 'test':
        event = {
          type: 'system.test',
          data: { message: 'Test webhook from admin panel', ...data }
        }
        break
        
      default:
        return NextResponse.json({ error: `Unknown event type: ${eventType}` }, { status: 400 })
    }

    // Dispatch the webhook
    const success = await dispatchWebhook(event)

    return NextResponse.json({ 
      success, 
      event: event.type,
      message: success ? 'Webhook dispatched successfully' : 'Webhook dispatch failed'
    })

  } catch (error) {
    console.error('Manual webhook trigger error:', error)
    return NextResponse.json({ error: 'Trigger failed' }, { status: 500 })
  }
}