/**
 * Webhook Dispatcher - Sends events to Clawdbot for immediate processing
 */

export interface WebhookEvent {
  type: string
  data: any
  timestamp?: number
  source?: string
}

export async function dispatchWebhook(event: WebhookEvent): Promise<boolean> {
  try {
    // Add timestamp if not provided
    if (!event.timestamp) {
      event.timestamp = Date.now()
    }

    // Add source if not provided
    if (!event.source) {
      event.source = 'bright-engine'
    }

    console.log('🚀 Dispatching webhook:', event.type)

    // Always log events for debugging
    console.log('🤖 [WEBHOOK]', JSON.stringify(event, null, 2))
    
    // In development, just log the event and return success
    if (process.env.NODE_ENV === 'development') {
      return true
    }

    // In production, send to the actual webhook endpoint
    const webhookUrl = process.env.CLAWDBOT_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/clawdbot'
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLAWDBOT_WEBHOOK_SECRET || 'dev-secret'}`,
        'User-Agent': 'BrightEngine/1.0'
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      console.error('❌ Webhook dispatch failed:', response.status, await response.text())
      return false
    }

    const result = await response.json()
    console.log('✅ Webhook dispatched successfully:', result)
    return true

  } catch (error) {
    console.error('❌ Webhook dispatch error:', error)
    return false
  }
}

// Event Type Helpers
export const WebhookEvents = {
  // Lead Events
  HOT_ENGAGEMENT: (leadId: string, eventType: string, urgencyScore: number, metadata?: any) => ({
    type: 'lead.hot_engagement',
    data: { leadId, eventType, urgencyScore, ...metadata }
  }),

  LEAD_IMPORTED: (leadIds: string[], campaign: string, metadata?: any) => ({
    type: 'lead.imported',
    data: { leadIds, campaign, count: leadIds.length, ...metadata }
  }),

  LEAD_STALLED: (leadId: string, daysSinceActivity: number) => ({
    type: 'lead.stalled',
    data: { leadId, daysSinceActivity }
  }),

  // Payment Events
  PAYMENT_RECEIVED: (leadId: string, clientId: string, amount: number, paymentMethod?: string) => ({
    type: 'payment.received',
    data: { leadId, clientId, amount, paymentMethod }
  }),

  // Client Events
  CLIENT_QUESTION: (clientId: string, question: string, phone: string, channel: string = 'SMS') => ({
    type: 'client.question',
    data: { clientId, question, phone, channel }
  }),

  CLIENT_ONBOARDED: (clientId: string, siteUrl?: string) => ({
    type: 'client.onboarded',
    data: { clientId, siteUrl }
  }),

  // System Events
  DAILY_DIGEST_REQUESTED: (requestedBy: string = 'system') => ({
    type: 'daily.digest_requested',
    data: { requestedBy, date: new Date().toISOString().split('T')[0] }
  }),

  SYSTEM_ALERT: (level: 'info' | 'warning' | 'error', message: string, metadata?: any) => ({
    type: 'system.alert',
    data: { level, message, ...metadata }
  }),

  // Rep Events
  REP_PERFORMANCE_ALERT: (repId: string, metric: string, value: number, threshold: number) => ({
    type: 'rep.performance_alert',
    data: { repId, metric, value, threshold }
  })
}

// Batch dispatch for multiple events
export async function dispatchWebhookBatch(events: WebhookEvent[]): Promise<boolean[]> {
  const results = await Promise.all(events.map(event => dispatchWebhook(event)))
  return results
}