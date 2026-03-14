/**
 * SmartChat Message Batcher
 *
 * Collects rapid-fire inbound messages (within a configurable window)
 * and processes them as a single batch. Prevents the AI from sending
 * multiple responses when a client fires off texts quickly.
 *
 * Also includes conversation-ender detection — skips AI response for
 * messages like "ok", "thanks", emoji-only, etc.
 */

import { prisma } from './db'

// ── In-memory batch tracking ──
// This works because Railway runs a persistent Node process, not serverless lambdas.

interface PendingBatch {
  conversationId: string
  leadId: string
  messages: Array<{ body: string; mediaUrls: string[] }>
  timer: ReturnType<typeof setTimeout>
}

const activeBatches = new Map<string, PendingBatch>()

// ── Settings loader ──

interface SmartChatSettings {
  batchWindowMs: number
  conversationEnderEnabled: boolean
  qualifyingQuestionCount: number
  formBaseUrl: string
}

const DEFAULT_SMART_CHAT: SmartChatSettings = {
  batchWindowMs: 8000,
  conversationEnderEnabled: true,
  qualifyingQuestionCount: 2,
  formBaseUrl: '',
}

let cachedSettings: SmartChatSettings | null = null
let settingsCachedAt = 0
const SETTINGS_TTL = 60_000 // 1 minute cache

export async function getSmartChatSettings(): Promise<SmartChatSettings> {
  if (cachedSettings && Date.now() - settingsCachedAt < SETTINGS_TTL) {
    return cachedSettings
  }

  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'smart_chat' },
    })

    if (setting && typeof setting.value === 'object') {
      const val = setting.value as Record<string, unknown>
      cachedSettings = {
        batchWindowMs: typeof val.batchWindowMs === 'number' ? val.batchWindowMs : DEFAULT_SMART_CHAT.batchWindowMs,
        conversationEnderEnabled: typeof val.conversationEnderEnabled === 'boolean' ? val.conversationEnderEnabled : DEFAULT_SMART_CHAT.conversationEnderEnabled,
        qualifyingQuestionCount: typeof val.qualifyingQuestionCount === 'number' ? val.qualifyingQuestionCount : DEFAULT_SMART_CHAT.qualifyingQuestionCount,
        formBaseUrl: typeof val.formBaseUrl === 'string' ? val.formBaseUrl : DEFAULT_SMART_CHAT.formBaseUrl,
      }
    } else {
      cachedSettings = { ...DEFAULT_SMART_CHAT }
    }
  } catch {
    cachedSettings = { ...DEFAULT_SMART_CHAT }
  }

  settingsCachedAt = Date.now()
  return cachedSettings!
}

// Export for settings API defaults
export { DEFAULT_SMART_CHAT }

// ── Conversation-ender detection ──

const CONVERSATION_ENDERS = new Set([
  'ok', 'okay', 'k', 'kk', 'cool', 'sure', 'alright', 'bet', 'word',
  'yep', 'yup', 'ya', 'yeah', 'got it', 'gotcha',
  'sounds good', 'perfect', 'great', 'nice', 'awesome',
  'thanks', 'thank you', 'thx', 'ty', 'appreciate it',
  'will do', 'for sure', 'no problem', 'np', 'all good', 'good deal',
  'talk soon', 'talk later', 'ttyl',
  'have a good one', 'have a good day',
  'gn', 'good night', 'bye', 'later', 'peace',
  'noted', 'understood', 'aight',
])

// ── Acceptance signal detection ──
// These phrases indicate client approval (e.g. "looks good" on a preview).
// They overlap with enders ("perfect", "great") but should NEVER be silenced
// because the batcher doesn't know the conversation stage. Let the processor
// handle stage-aware ender detection instead.
const ACCEPTANCE_PHRASES = [
  'looks good', 'looks great', 'looks perfect', 'looks amazing', 'looks awesome',
  'love it', 'i love it', 'looks beautiful',
  'let\'s do it', 'lets do it', 'let\'s go', 'lets go',
  'i\'ll take it', 'ill take it', 'i want it',
  'sign me up', 'ready to go', 'let\'s move forward', 'lets move forward',
  'send the link', 'send me the link', 'book a call', 'schedule a meeting',
  'book a meeting', 'set up a call', 'when can we meet',
  'i\'m in', 'im in', 'i\'m ready', 'im ready',
  'go ahead', 'approved', 'approve it',
  'make it live', 'go live', 'launch it', 'publish it',
]

function isAcceptanceSignal(message: string): boolean {
  const lower = message.toLowerCase().trim()
  return ACCEPTANCE_PHRASES.some(phrase => lower.includes(phrase))
}

const EMOJI_ENDERS = new Set([
  '\uD83D\uDC4D',     // 👍
  '\uD83D\uDC4D\uD83C\uDFFB', // 👍🏻
  '\uD83D\uDC4D\uD83C\uDFFC', // 👍🏼
  '\uD83D\uDC4D\uD83C\uDFFD', // 👍🏽
  '\uD83D\uDC4D\uD83C\uDFFE', // 👍🏾
  '\uD83D\uDC4D\uD83C\uDFFF', // 👍🏿
  '\uD83D\uDE4F',     // 🙏
  '\u2705',           // ✅
  '\uD83D\uDCAF',     // 💯
  '\uD83E\uDD19',     // 🤙
  '\uD83D\uDC4C',     // 👌
])

/**
 * Check if the combined batch message is a conversation-ender
 * that the AI should NOT respond to.
 */
export function isConversationEnder(message: string): boolean {
  const trimmed = message.trim()
  if (!trimmed) return true

  // Split batch into individual messages (newline-separated from batching)
  const parts = trimmed.split('\n').map(p => p.trim()).filter(Boolean)

  // If ANY part is NOT an ender, the batch needs a response
  for (const part of parts) {
    if (!isSingleMessageEnder(part)) {
      return false
    }
  }

  return true
}

function isSingleMessageEnder(msg: string): boolean {
  const lower = msg.toLowerCase().trim()

  // Has question mark → needs response
  if (lower.includes('?')) return false

  // Longer than ~4 words → probably not just an acknowledgment
  const wordCount = lower.split(/\s+/).length
  if (wordCount > 4) return false

  // Check exact match against ender list (with/without punctuation)
  const stripped = lower.replace(/[.!]+$/, '')
  if (CONVERSATION_ENDERS.has(stripped)) return true

  // Check emoji-only
  if (EMOJI_ENDERS.has(msg.trim())) return true

  // Single emoji check (any emoji-only message)
  const emojiOnly = /^[\p{Emoji}\p{Emoji_Presentation}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Component}\s]+$/u
  if (emojiOnly.test(msg.trim()) && wordCount <= 2) return true

  return false
}

// ── Message batching ──

/**
 * Add a message to the batch queue. Returns true if the message was batched
 * (AI processing will happen later), false if batching is disabled and the
 * caller should process immediately.
 */
export async function addToBatch(
  conversationId: string,
  leadId: string,
  body: string,
  mediaUrls: string[],
  processor: (convId: string, combinedBody: string, mediaUrls: string[]) => Promise<void>,
): Promise<boolean> {
  const settings = await getSmartChatSettings()

  if (settings.batchWindowMs <= 0) {
    // Batching disabled — process immediately but still check conversation-ender
    if (settings.conversationEnderEnabled && isConversationEnder(body) && !isAcceptanceSignal(body) && mediaUrls.length === 0) {
      console.log(`[SmartChat] Conversation-ender detected, skipping AI response: "${body.slice(0, 50)}"`)
      return true // Consumed — don't process
    }
    return false // Caller should process normally
  }

  const existing = activeBatches.get(conversationId)

  if (existing) {
    // Clear existing timer, add message, reset timer
    clearTimeout(existing.timer)
    existing.messages.push({ body, mediaUrls })
    existing.timer = setTimeout(
      () => processBatch(conversationId, processor, settings),
      settings.batchWindowMs,
    )
    console.log(`[SmartChat] Added to existing batch for conversation ${conversationId.slice(0, 8)}... (${existing.messages.length} messages)`)
  } else {
    // New batch
    const batch: PendingBatch = {
      conversationId,
      leadId,
      messages: [{ body, mediaUrls }],
      timer: setTimeout(
        () => processBatch(conversationId, processor, settings),
        settings.batchWindowMs,
      ),
    }
    activeBatches.set(conversationId, batch)
    console.log(`[SmartChat] New batch started for conversation ${conversationId.slice(0, 8)}... (${settings.batchWindowMs}ms window)`)
  }

  return true // Message batched — don't process immediately
}

async function processBatch(
  conversationId: string,
  processor: (convId: string, combinedBody: string, mediaUrls: string[]) => Promise<void>,
  settings: SmartChatSettings,
) {
  const batch = activeBatches.get(conversationId)
  if (!batch) return
  activeBatches.delete(conversationId)

  // Combine all messages
  const combinedBody = batch.messages
    .map(m => m.body)
    .filter(Boolean)
    .join('\n')

  const allMediaUrls = batch.messages.flatMap(m => m.mediaUrls)

  console.log(`[SmartChat] Processing batch for conversation ${conversationId.slice(0, 8)}... (${batch.messages.length} messages)`)

  // Check conversation-ender on the combined batch (but never block acceptance signals)
  if (settings.conversationEnderEnabled && isConversationEnder(combinedBody) && !isAcceptanceSignal(combinedBody) && allMediaUrls.length === 0) {
    console.log(`[SmartChat] Batch is all conversation-enders, skipping AI response: "${combinedBody.slice(0, 80)}"`)
    return
  }

  // Process the combined batch through the AI
  try {
    await processor(conversationId, combinedBody, allMediaUrls)
  } catch (err) {
    console.error(`[SmartChat] Batch processing failed for ${conversationId}:`, err)
  }
}
