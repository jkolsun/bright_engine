/**
 * Automated Messages — Editable scheduled/triggered message templates
 *
 * These fire on a schedule (day X after event) or after a timer.
 * Pre-client: form nudge, preview follow-up, payment follow-ups
 * Post-client: touchpoint sequence, win-back sequence
 *
 * Customizable in Settings → Messages & AI → Automated Messages.
 */

import { prisma } from './db'

// ============================================
// Types
// ============================================

export interface AutomatedMessageTemplate {
  text: string
  enabled: boolean
  delayHours?: number
}

export interface AutomatedMessagesConfig {
  // Pre-Client
  form_nudge: AutomatedMessageTemplate
  preview_followup: AutomatedMessageTemplate
  payment_followup_4h: AutomatedMessageTemplate
  payment_followup_24h: AutomatedMessageTemplate
  payment_followup_48h: AutomatedMessageTemplate
  payment_followup_72h: AutomatedMessageTemplate

  // Post-Client touchpoints
  touchpoint_day_3: AutomatedMessageTemplate
  touchpoint_day_7: AutomatedMessageTemplate
  touchpoint_day_14: AutomatedMessageTemplate
  touchpoint_day_21: AutomatedMessageTemplate
  touchpoint_day_28: AutomatedMessageTemplate

  // Win-back
  winback_day_7: AutomatedMessageTemplate
  winback_day_14: AutomatedMessageTemplate
  winback_day_30: AutomatedMessageTemplate
}

export type AutomatedMessageKey = keyof AutomatedMessagesConfig

// ============================================
// Defaults
// ============================================

export const DEFAULT_AUTOMATED_MESSAGES: AutomatedMessagesConfig = {
  // Pre-Client
  form_nudge: {
    text: "Hey {firstName}, just following up — did you get a chance to fill out the form? Here's the link again: {formUrl}",
    enabled: true,
    delayHours: 24,
  },
  preview_followup: {
    text: "Hey {firstName}, wanted to check in — did you get a chance to look at the preview? Let me know what you think: {previewUrl}",
    enabled: true,
    delayHours: 24,
  },
  payment_followup_4h: {
    text: "Hey {firstName}, just checking — any questions about getting your site live?",
    enabled: true,
    delayHours: 4,
  },
  payment_followup_24h: {
    text: "Hey {firstName}, just wanted to make sure you got the payment link. Any questions about getting your site live?",
    enabled: true,
    delayHours: 24,
  },
  payment_followup_48h: {
    text: "Hey {firstName}, your preview is looking great. Payment link is ready when you are!",
    enabled: true,
    delayHours: 48,
  },
  payment_followup_72h: {
    text: "Last check-in — want me to hold your spot or should I free it up for someone else, {firstName}?",
    enabled: true,
    delayHours: 72,
  },

  // Post-Client touchpoints
  touchpoint_day_3: {
    text: "Hey {firstName}! Quick tip — make sure your Google Business Profile is claimed and up to date. That alone can double your local visibility for {companyName}.",
    enabled: true,
    delayHours: 72,
  },
  touchpoint_day_7: {
    text: "Hey {firstName}! Your {companyName} site has been live for a week now. Everything looking good? Reply if you need anything.",
    enabled: true,
    delayHours: 168,
  },
  touchpoint_day_14: {
    text: "Hey {firstName}, quick 2-week check-in on {companyName}'s site. How's it working for you so far? Any changes you'd like?",
    enabled: true,
    delayHours: 336,
  },
  touchpoint_day_21: {
    text: "Hey {firstName}, just wanted to see how things are going with {companyName}'s site. Getting any leads from it?",
    enabled: true,
    delayHours: 504,
  },
  touchpoint_day_28: {
    text: "Hey {firstName}! It's been a month since {companyName} went live. Love to hear how it's going — and I have some ideas that could help you get even more out of it.",
    enabled: true,
    delayHours: 672,
  },

  // Win-back
  winback_day_7: {
    text: 'Your hosting was cancelled. {companyName}\'s site goes offline in 7 days. Reply "keep it" to reactivate.',
    enabled: true,
    delayHours: 168,
  },
  winback_day_14: {
    text: "Hey, just wanted to let you know {companyName}'s site will be taken down soon. If you change your mind, just reply and we'll keep it live.",
    enabled: true,
    delayHours: 336,
  },
  winback_day_30: {
    text: "Last chance — {companyName}'s site data will be deleted in 48 hours. Reply to save it.",
    enabled: true,
    delayHours: 720,
  },
}

// ============================================
// Template metadata (for UI display)
// ============================================

export interface AutomatedMessageMeta {
  key: AutomatedMessageKey
  label: string
  description: string
  variables: string[]
  category: 'pre_client' | 'post_client' | 'winback'
}

export const AUTOMATED_MESSAGE_META: AutomatedMessageMeta[] = [
  // Pre-Client
  {
    key: 'form_nudge',
    label: 'Form Nudge',
    description: 'Sent if client hasn\'t filled out form.',
    variables: ['firstName', 'formUrl'],
    category: 'pre_client',
  },
  {
    key: 'preview_followup',
    label: 'Preview Follow-up',
    description: 'Sent if client hasn\'t responded after seeing preview.',
    variables: ['firstName', 'previewUrl'],
    category: 'pre_client',
  },
  {
    key: 'payment_followup_4h',
    label: 'Payment Follow-up (4h)',
    description: '4 hours after payment link sent.',
    variables: ['firstName'],
    category: 'pre_client',
  },
  {
    key: 'payment_followup_24h',
    label: 'Payment Follow-up (24h)',
    description: '24 hours after payment link sent.',
    variables: ['firstName'],
    category: 'pre_client',
  },
  {
    key: 'payment_followup_48h',
    label: 'Payment Follow-up (48h)',
    description: '48 hours after payment link sent.',
    variables: ['firstName'],
    category: 'pre_client',
  },
  {
    key: 'payment_followup_72h',
    label: 'Payment Follow-up (72h)',
    description: 'Final follow-up 72 hours after payment link sent.',
    variables: ['firstName'],
    category: 'pre_client',
  },

  // Post-Client touchpoints
  {
    key: 'touchpoint_day_3',
    label: 'Day 3 — GBP Reminder',
    description: 'Google Business Profile optimization tip.',
    variables: ['firstName', 'companyName'],
    category: 'post_client',
  },
  {
    key: 'touchpoint_day_7',
    label: 'Day 7 — First Week Stats',
    description: 'First week check-in.',
    variables: ['firstName', 'companyName'],
    category: 'post_client',
  },
  {
    key: 'touchpoint_day_14',
    label: 'Day 14 — Two Week Check-in',
    description: 'Two week check-in and change request.',
    variables: ['firstName', 'companyName'],
    category: 'post_client',
  },
  {
    key: 'touchpoint_day_21',
    label: 'Day 21 — Lead Check',
    description: 'Check if they\'re getting leads from the site.',
    variables: ['firstName', 'companyName'],
    category: 'post_client',
  },
  {
    key: 'touchpoint_day_28',
    label: 'Day 28 — Month Review',
    description: 'Andrew takes over for upsell conversation.',
    variables: ['firstName', 'companyName'],
    category: 'post_client',
  },

  // Win-back
  {
    key: 'winback_day_7',
    label: 'Win-Back Day 7',
    description: '7 days after hosting cancellation.',
    variables: ['companyName'],
    category: 'winback',
  },
  {
    key: 'winback_day_14',
    label: 'Win-Back Day 14',
    description: '14 days after hosting cancellation.',
    variables: ['companyName'],
    category: 'winback',
  },
  {
    key: 'winback_day_30',
    label: 'Win-Back Day 30',
    description: 'Final notice 30 days after cancellation.',
    variables: ['companyName'],
    category: 'winback',
  },
]

// ============================================
// Cache
// ============================================

let cached: AutomatedMessagesConfig | null = null
let cacheTime = 0
const CACHE_TTL = 60_000

// ============================================
// Public API
// ============================================

export async function getAutomatedMessages(): Promise<AutomatedMessagesConfig> {
  const now = Date.now()
  if (cached && (now - cacheTime) < CACHE_TTL) return cached

  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'automated_messages' },
    })
    const saved = setting?.value
      ? (typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value) as Record<string, any>
      : {}

    const merged: any = { ...DEFAULT_AUTOMATED_MESSAGES }
    for (const key of Object.keys(DEFAULT_AUTOMATED_MESSAGES)) {
      if (saved[key] && typeof saved[key] === 'object') {
        merged[key] = { ...DEFAULT_AUTOMATED_MESSAGES[key as AutomatedMessageKey], ...saved[key] }
      }
    }

    cached = merged
    cacheTime = now
    return merged
  } catch (err) {
    console.error('[AutomatedMessages] Failed to load, using defaults:', err)
    return DEFAULT_AUTOMATED_MESSAGES
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
  // Clean up artifacts from empty variable substitution (e.g. empty firstName)
  result = result
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/,\s*([!?.])/g, '$1')  // orphaned comma before punctuation: ", !" → "!"
    .replace(/\s([!?,.])/g, '$1')   // space before punctuation: " !" → "!"
    .trim()
  return result
}

export async function getAutomatedMessage(
  key: AutomatedMessageKey,
  vars: Record<string, string>
): Promise<{ text: string; enabled: boolean }> {
  const messages = await getAutomatedMessages()
  const template = messages[key] || DEFAULT_AUTOMATED_MESSAGES[key]
  return {
    text: fillTemplate(template.text, vars),
    enabled: template.enabled,
  }
}
