/**
 * Admin SMS notification helper.
 * Reads the admin phone from company_info settings and sends SMS alerts
 * for high-priority events (hot leads, payments, escalations).
 *
 * Rate limited: max 1 SMS per notification type per 15 minutes via Redis.
 */

import { prisma } from './db'
import { sendSMSViaProvider } from './sms-provider'

type NotificationType = 'hot_lead' | 'payment' | 'escalation' | 'edit_request' | 'domain_verified'

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
