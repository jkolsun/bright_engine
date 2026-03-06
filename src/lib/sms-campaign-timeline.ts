/**
 * SMS Campaign Timeline Builder
 *
 * Merges data from multiple tables into a single chronological timeline
 * for a specific lead within a campaign.
 */

import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimelineEntry {
  timestamp: Date
  type: string
  icon: string
  title: string
  description: string
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

function iconForEventType(eventType: string): string {
  switch (eventType) {
    case 'SMS_COLD_SENT':
      return 'send'
    case 'SMS_DELIVERED':
      return 'check-circle'
    case 'SMS_CLICKED':
      return 'mouse-pointer'
    case 'SMS_OPT_IN':
      return 'user-check'
    case 'SMS_OPT_OUT':
      return 'user-x'
    case 'SMS_DRIP_SENT':
      return 'repeat'
    case 'SMS_FAILED':
      return 'alert-circle'
    case 'STAGE_CHANGE':
      return 'arrow-right'
    default:
      return 'activity'
  }
}

function iconForMessageType(messageType: string): string {
  switch (messageType) {
    case 'COLD_TEXT':
      return 'message-square'
    case 'DRIP_1':
    case 'DRIP_2':
    case 'DRIP_3':
    case 'DRIP_4':
    case 'DRIP_5':
      return 'repeat'
    case 'REP_MANUAL':
      return 'user'
    case 'INBOUND_REPLY':
      return 'message-circle'
    default:
      return 'message-square'
  }
}

function titleForMessageType(messageType: string, direction: string): string {
  if (direction === 'INBOUND') {
    return 'Inbound Reply'
  }
  switch (messageType) {
    case 'COLD_TEXT':
      return 'Cold Text Sent'
    case 'DRIP_1':
      return 'Drip Step 1 Sent'
    case 'DRIP_2':
      return 'Drip Step 2 Sent'
    case 'DRIP_3':
      return 'Drip Step 3 Sent'
    case 'DRIP_4':
      return 'Drip Step 4 Sent'
    case 'DRIP_5':
      return 'Drip Step 5 Sent'
    case 'REP_MANUAL':
      return 'Rep Manual Message'
    default:
      return 'Campaign Message'
  }
}

function titleForEventType(eventType: string): string {
  switch (eventType) {
    case 'SMS_COLD_SENT':
      return 'Cold Text Dispatched'
    case 'SMS_DELIVERED':
      return 'SMS Delivered'
    case 'SMS_CLICKED':
      return 'Preview Link Clicked'
    case 'SMS_OPT_IN':
      return 'Lead Opted In'
    case 'SMS_OPT_OUT':
      return 'Lead Opted Out'
    case 'SMS_DRIP_SENT':
      return 'Drip Message Sent'
    case 'SMS_FAILED':
      return 'SMS Failed'
    case 'STAGE_CHANGE':
      return 'Stage Changed'
    default:
      return eventType.replace(/_/g, ' ')
  }
}

// ---------------------------------------------------------------------------
// buildTimeline
// ---------------------------------------------------------------------------

export async function buildTimeline(
  campaignId: string,
  leadId: string
): Promise<TimelineEntry[]> {
  const timeline: TimelineEntry[] = []

  // Run all queries in parallel
  const [campaignMessages, leadEvents, repTasks, dialerCalls, messages] =
    await Promise.all([
      // 1. SmsCampaignMessage — cold texts, drip messages, inbound replies
      prisma.smsCampaignMessage.findMany({
        where: { campaignId, leadId },
        orderBy: { createdAt: 'asc' },
      }),

      // 2. LeadEvent — SMS-related events for this lead
      prisma.leadEvent.findMany({
        where: {
          leadId,
          eventType: {
            in: [
              'SMS_COLD_SENT',
              'SMS_DELIVERED',
              'SMS_CLICKED',
              'SMS_OPT_IN',
              'SMS_OPT_OUT',
              'SMS_DRIP_SENT',
              'SMS_FAILED',
              'STAGE_CHANGE',
            ],
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 3. RepTask — SMS-related tasks (clicker calls, drip hot signals)
      prisma.repTask.findMany({
        where: {
          leadId,
          taskType: { in: ['SMS_CLICKER_CALL', 'DRIP_HOT_SIGNAL', 'INITIAL_CALL'] },
        },
        include: {
          rep: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // 4. DialerCall — actual phone calls to this lead
      prisma.dialerCall.findMany({
        where: { leadId },
        include: {
          rep: { select: { name: true } },
        },
        orderBy: { startedAt: 'asc' },
      }),

      // 5. Message — all SMS messages (source of truth for delivery)
      prisma.message.findMany({
        where: {
          leadId,
          channel: 'SMS',
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

  // --- Map campaign messages ---
  for (const msg of campaignMessages) {
    timeline.push({
      timestamp: msg.sentAt || msg.createdAt,
      type: 'campaign_message',
      icon: iconForMessageType(msg.messageType),
      title: titleForMessageType(msg.messageType, msg.direction),
      description: msg.content.length > 120
        ? msg.content.slice(0, 120) + '...'
        : msg.content,
      metadata: {
        messageType: msg.messageType,
        direction: msg.direction,
        twilioSid: msg.twilioSid,
        twilioStatus: msg.twilioStatus,
        deliveredAt: msg.deliveredAt,
        failedAt: msg.failedAt,
      },
    })
  }

  // --- Map lead events ---
  for (const evt of leadEvents) {
    // Filter to events related to this campaign if metadata has campaignId
    const meta = evt.metadata as Record<string, unknown> | null
    if (meta?.campaignId && meta.campaignId !== campaignId) {
      continue
    }

    timeline.push({
      timestamp: evt.createdAt,
      type: 'lead_event',
      icon: iconForEventType(evt.eventType),
      title: titleForEventType(evt.eventType),
      description: evt.fromStage && evt.toStage
        ? `${evt.fromStage} → ${evt.toStage}`
        : evt.actor
          ? `By ${evt.actor}`
          : '',
      metadata: {
        eventType: evt.eventType,
        fromStage: evt.fromStage,
        toStage: evt.toStage,
        ...(meta || {}),
      },
    })
  }

  // --- Map rep tasks ---
  for (const task of repTasks) {
    timeline.push({
      timestamp: task.createdAt,
      type: 'rep_task',
      icon: task.status === 'COMPLETED' ? 'check-square' : 'clipboard',
      title: `Task: ${task.taskType.replace(/_/g, ' ')}`,
      description: [
        task.rep?.name ? `Assigned to ${task.rep.name}` : null,
        task.status ? `Status: ${task.status}` : null,
        task.outcome ? `Outcome: ${task.outcome}` : null,
        task.notes || null,
      ]
        .filter(Boolean)
        .join(' | '),
      metadata: {
        taskId: task.id,
        taskType: task.taskType,
        status: task.status,
        priority: task.priority,
        repName: task.rep?.name,
        completedAt: task.completedAt,
      },
    })
  }

  // --- Map dialer calls ---
  for (const call of dialerCalls) {
    const durationStr = call.duration
      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
      : 'N/A'

    timeline.push({
      timestamp: call.startedAt,
      type: 'dialer_call',
      icon: call.direction === 'INBOUND' ? 'phone-incoming' : 'phone-outgoing',
      title: `${call.direction === 'INBOUND' ? 'Inbound' : 'Outbound'} Call`,
      description: [
        call.rep?.name ? `Rep: ${call.rep.name}` : null,
        `Status: ${call.status}`,
        `Duration: ${durationStr}`,
        call.dispositionResult ? `Disposition: ${call.dispositionResult}` : null,
        call.vmDropped ? 'VM Dropped' : null,
      ]
        .filter(Boolean)
        .join(' | '),
      metadata: {
        callId: call.id,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        dispositionResult: call.dispositionResult,
        repName: call.rep?.name,
        connectedAt: call.connectedAt,
        endedAt: call.endedAt,
        vmDropped: call.vmDropped,
        previewSentDuringCall: call.previewSentDuringCall,
      },
    })
  }

  // --- Map SMS messages (source of truth) ---
  for (const msg of messages) {
    // Avoid duplicating campaign messages we already have
    // by checking if a campaign message with the same twilioSid exists
    const alreadyTracked = msg.twilioSid
      ? campaignMessages.some((cm) => cm.twilioSid === msg.twilioSid)
      : false

    if (!alreadyTracked) {
      timeline.push({
        timestamp: msg.createdAt,
        type: 'sms_message',
        icon: msg.direction === 'INBOUND' ? 'message-circle' : 'message-square',
        title: msg.direction === 'INBOUND' ? 'Inbound SMS' : 'Outbound SMS',
        description: msg.content.length > 120
          ? msg.content.slice(0, 120) + '...'
          : msg.content,
        metadata: {
          messageId: msg.id,
          direction: msg.direction,
          twilioSid: msg.twilioSid,
          twilioStatus: msg.twilioStatus,
          senderName: msg.senderName,
          senderType: msg.senderType,
          trigger: msg.trigger,
          aiGenerated: msg.aiGenerated,
        },
      })
    }
  }

  // Sort by timestamp ascending
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return timeline
}
