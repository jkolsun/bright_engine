/**
 * System Messages — Editable one-time triggered message templates
 *
 * These are NOT AI-generated. They fire after specific events
 * (form submission, preview approval, payment, etc.) and can
 * be customized in Settings → Messages & AI → Automated Messages.
 */

import { prisma } from './db'

// ============================================
// Types
// ============================================

export interface SystemMessageTemplate {
  text: string
  enabled: boolean
}

export interface SystemMessagesConfig {
  form_thank_you: SystemMessageTemplate
  preview_sent: SystemMessageTemplate
  payment_link: SystemMessageTemplate
  welcome_after_payment: SystemMessageTemplate
  site_live: SystemMessageTemplate
}

export type SystemMessageKey = keyof SystemMessagesConfig

// ============================================
// Defaults
// ============================================

export const DEFAULT_SYSTEM_MESSAGES: SystemMessagesConfig = {
  form_thank_you: {
    text: "Got it, thank you {firstName}! Our team is reviewing everything now and we'll get started on your site. You'll get a text when it's ready for review.",
    enabled: true,
  },
  preview_sent: {
    text: "Hey {firstName}! Your website for {companyName} is ready for review. Take a look and let me know what you think: {previewUrl}",
    enabled: true,
  },
  payment_link: {
    text: "Here's your payment link to go live: {paymentLink}\n\n{firstMonthTotal} gets your site built and launched, plus monthly hosting at {monthlyHosting}/month. You can cancel anytime.\n\nOnce you pay, we'll have your site live within 48 hours!",
    enabled: true,
  },
  welcome_after_payment: {
    text: "Welcome aboard, {firstName}! 🎉 Your site is going live. You'll get a text from us when it's up. Quick win: make sure your Google Business Profile is claimed — that alone can double your local visibility.",
    enabled: true,
  },
  site_live: {
    text: "Hey {firstName}! Your site for {companyName} is officially live at {siteUrl} 🚀 Check it out and let us know if you want any changes!",
    enabled: true,
  },
}

// ============================================
// Template metadata (for UI display)
// ============================================

export interface SystemMessageMeta {
  key: SystemMessageKey
  label: string
  description: string
  variables: string[]
}

export const SYSTEM_MESSAGE_META: SystemMessageMeta[] = [
  {
    key: 'form_thank_you',
    label: 'Form Thank You',
    description: 'Sent immediately after lead completes the onboarding form.',
    variables: ['firstName'],
  },
  {
    key: 'preview_sent',
    label: 'Preview Sent',
    description: 'Sent when admin approves sending the site preview.',
    variables: ['firstName', 'companyName', 'previewUrl'],
  },
  {
    key: 'payment_link',
    label: 'Payment Link Sent',
    description: 'Sent with the Stripe checkout link when admin approves payment.',
    variables: ['firstName', 'companyName', 'paymentLink', 'firstMonthTotal', 'monthlyHosting'],
  },
  {
    key: 'welcome_after_payment',
    label: 'Welcome After Payment',
    description: 'Sent ~2.5 minutes after Stripe payment succeeds.',
    variables: ['firstName'],
  },
  {
    key: 'site_live',
    label: 'Site Live Notification',
    description: 'Sent after domain is set up and site goes live.',
    variables: ['firstName', 'companyName', 'siteUrl'],
  },
]

// ============================================
// Cache
// ============================================

let cached: SystemMessagesConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60_000 // 1 minute

// ============================================
// Public API
// ============================================

export async function getSystemMessages(): Promise<SystemMessagesConfig> {
  const now = Date.now()
  if (cached && (now - cacheTime) < CACHE_TTL) return cached

  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'system_messages' },
    })
    const saved = setting?.value
      ? (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) as Record<string, any>
      : {}

    // Deep merge each key with defaults
    const merged: any = { ...DEFAULT_SYSTEM_MESSAGES }
    for (const key of Object.keys(DEFAULT_SYSTEM_MESSAGES)) {
      if (saved[key] && typeof saved[key] === 'object') {
        merged[key] = { ...DEFAULT_SYSTEM_MESSAGES[key as SystemMessageKey], ...saved[key] }
      }
    }

    cached = merged
    cacheTime = now
    return merged
  } catch (err) {
    console.error('[SystemMessages] Failed to load, using defaults:', err)
    return DEFAULT_SYSTEM_MESSAGES
  }
}

export function fillTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

export async function getSystemMessage(
  key: SystemMessageKey,
  vars: Record<string, string>
): Promise<{ text: string; enabled: boolean }> {
  const messages = await getSystemMessages()
  const template = messages[key] || DEFAULT_SYSTEM_MESSAGES[key]
  return {
    text: fillTemplate(template.text, vars),
    enabled: template.enabled,
  }
}
