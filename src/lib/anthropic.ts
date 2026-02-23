/**
 * Shared Anthropic Client Singleton
 *
 * Centralizes the Anthropic SDK client so every module shares one instance.
 * Registers an invalidator with api-keys so admin key changes reset the client.
 */

import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export function resetAnthropicClient(): void {
  _client = null
}

/**
 * Calculate actual API cost from token usage.
 * Sonnet 4.5: $3/M input, $15/M output. Haiku 4.5: $0.80/M input, $4/M output.
 * Falls back to a hardcoded estimate if usage data isn't available.
 */
export function calculateApiCost(
  usage: { input_tokens: number; output_tokens: number } | undefined,
  fallback: number,
  model: 'sonnet' | 'haiku' = 'sonnet'
): number {
  if (!usage) return fallback
  const rates = model === 'haiku'
    ? { input: 0.80, output: 4 }
    : { input: 3, output: 15 }
  return (usage.input_tokens * rates.input + usage.output_tokens * rates.output) / 1_000_000
}

// BUG 15.8: Per-lead AI rate limiting (max 5 calls per lead per minute)
const AI_RATE_LIMIT = 5
const AI_RATE_WINDOW_MS = 60 * 1000
const leadCallCounts = new Map<string, { count: number; resetAt: number }>()

export function checkAiRateLimit(leadId: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = leadCallCounts.get(leadId)

  if (!entry || now > entry.resetAt) {
    leadCallCounts.set(leadId, { count: 1, resetAt: now + AI_RATE_WINDOW_MS })
    return { allowed: true, remaining: AI_RATE_LIMIT - 1 }
  }

  if (entry.count >= AI_RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: AI_RATE_LIMIT - entry.count }
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of leadCallCounts) {
    if (now > entry.resetAt) leadCallCounts.delete(key)
  }
}, 5 * 60 * 1000)

// Register invalidator so admin API key changes take effect everywhere
try {
  const { registerClientInvalidator } = require('./api-keys')
  registerClientInvalidator(() => { _client = null })
} catch { /* api-keys module may not be loaded yet */ }
