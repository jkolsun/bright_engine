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

// Register invalidator so admin API key changes take effect everywhere
try {
  const { registerClientInvalidator } = require('./api-keys')
  registerClientInvalidator(() => { _client = null })
} catch { /* api-keys module may not be loaded yet */ }
