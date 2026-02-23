/**
 * Admin SMS notification helper + notification deduplication (BUG P.1).
 * Reads the admin phone from company_info settings and sends SMS alerts
 * for high-priority events (hot leads, payments, escalations).
 *
 * Rate limited: max 1 SMS per notification type per 15 minutes via Redis.
 */

import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'
import type { NotificationType as PrismaNotificationType } from '@prisma/client'

type NotificationType = 'hot_lead' | 'payment' | 'escalation' | 'edit_request' | 'domain_verified' | 'approval'

/**
 * BUG P.1: Create a notification with deduplication.
 * Checks for an existing notification with the same type and metadata dedupKey
 * within the last hour before creating a new one.
 *
 * @param data - Standard notification fields (type, title, message, metadata)
 * @param dedupKey - The metadata key path to check for duplicates (e.g., 'leadId', 'clientId')
 * @param dedupWindowMs - Time window for dedup check (default: 1 hour)
 */
export async function createNotificationDeduped(
  data: {
    type: PrismaNotificationType
    title: string
    message: string
    metadata?: Record<string, unknown>
  },
  dedupKey?: string,
  dedupWindowMs: number = 60 * 60 * 1000, // 1 hour default
) {
  try {
    // If a dedupKey is provided, check for existing recent notification
    if (dedupKey && data.metadata && data.metadata[dedupKey] !== undefined) {
      const windowStart = new Date(Date.now() - dedupWindowMs)
      const existing = await prisma.notification.findFirst({
        where: {
          type: data.type,
          metadata: { path: [dedupKey], equals: data.metadata[dedupKey] as any },
          createdAt: { gte: windowStart },
        },
      })
      if (existing) return existing // Skip duplicate
    }

    return await prisma.notification.create({ data: data as any })
  } catch (err) {
    console.error('[createNotificationDeduped] Failed:', err)
    return null
  }
}

/**
 * Send an SMS notification to the admin phone number.
 * Rate limited per type (15 min cooldown) to prevent notification spam.
 */
export async function notifyAdmin(
  type: NotificationType,
  title: string,
  message: string,
): Promise<void> {
  try {
    // 1. Read admin phone from company_info settings
    const setting = await prisma.settings.findUnique({ where: { key: 'company_info' } })
    const companyInfo = setting?.value as Record<string, unknown> | null
    const adminPhone = companyInfo?.adminPhone as string | undefined
    if (!adminPhone || adminPhone.length < 10) return // No phone configured

    // 2. Rate limit check via Redis (15 min cooldown per type)
    let recentlySent = false
    try {
      const redis = (await import('./redis')).default
      const cooldownKey = `admin_notify:${type}:last_sent`
      const existing = await redis.get(cooldownKey)
      if (existing) {
        recentlySent = true
      } else {
        await redis.set(cooldownKey, '1', 'EX', 900) // 15 min TTL
      }
    } catch {
      // Redis unavailable — skip rate limiting, send anyway
    }

    if (recentlySent) {
      console.log(`[notifyAdmin] Skipping SMS (cooldown active) type=${type}`)
      return
    }

    // 3. Send SMS
    const smsText = `[BA] ${title}: ${message}`
    await sendSMSViaProvider({
      to: adminPhone,
      message: smsText.length > 160 ? smsText.slice(0, 157) + '...' : smsText,
      sender: 'system',
      trigger: `admin_notification_${type}`,
    })

    console.log(`[notifyAdmin] SMS sent to admin — type=${type}`)
  } catch (err) {
    console.error(`[notifyAdmin] Failed to send SMS (type=${type}):`, err)
    // Non-fatal — don't throw
  }
}
