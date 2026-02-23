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

// Register invalidator so admin API key changes take effect everywhere
try {
  const { registerClientInvalidator } = require('./api-keys')
  registerClientInvalidator(() => { _client = null })
} catch { /* api-keys module may not be loaded yet */ }
