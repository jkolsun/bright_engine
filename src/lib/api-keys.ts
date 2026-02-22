/**
 * API Key Management
 *
 * Central resolver for API keys. Checks DB overrides first, falls back to
 * environment variables. When admin saves a key via the UI, it's written to
 * both the DB (persistence) and process.env (immediate effect).
 *
 * Lazy singleton clients (Stripe, Twilio, Anthropic, Resend) register
 * invalidators so they re-initialize with the new key on next use.
 */

import { prisma } from './db'

// ── Service configuration ─────────────────────────────────────

export interface ServiceKeyConfig {
  id: string
  label: string
  keys: Array<{ name: string; label: string }>
}

export const SERVICE_CONFIG: ServiceKeyConfig[] = [
  {
    id: 'anthropic', label: 'Anthropic',
    keys: [{ name: 'ANTHROPIC_API_KEY', label: 'API Key' }],
  },
  {
    id: 'stripe', label: 'Stripe',
    keys: [{ name: 'STRIPE_SECRET_KEY', label: 'Secret Key' }],
  },
  {
    id: 'twilio', label: 'Twilio',
    keys: [
      { name: 'TWILIO_ACCOUNT_SID', label: 'Account SID' },
      { name: 'TWILIO_AUTH_TOKEN', label: 'Auth Token' },
      { name: 'TWILIO_PHONE_NUMBER', label: 'Phone Number' },
      { name: 'TWILIO_MESSAGING_SERVICE_SID', label: 'Messaging Service SID' },
    ],
  },
  {
    id: 'resend', label: 'Resend',
    keys: [
      { name: 'RESEND_API_KEY', label: 'API Key' },
      { name: 'RESEND_FROM_EMAIL', label: 'From Email' },
    ],
  },
  {
    id: 'instantly', label: 'Instantly',
    keys: [{ name: 'INSTANTLY_API_KEY', label: 'API Key' }],
  },
  {
    id: 'serpapi', label: 'SerpAPI',
    keys: [{ name: 'SERPAPI_KEY', label: 'API Key' }],
  },
  {
    id: 'serper', label: 'Serper',
    keys: [{ name: 'SERPER_API_KEY', label: 'API Key' }],
  },
  {
    id: 'cloudinary', label: 'Cloudinary',
    keys: [
      { name: 'CLOUDINARY_CLOUD_NAME', label: 'Cloud Name' },
      { name: 'CLOUDINARY_API_KEY', label: 'API Key' },
      { name: 'CLOUDINARY_API_SECRET', label: 'API Secret' },
    ],
  },
]

// ── DB operations ──────────────────────────────────────────────

const DB_KEY = 'api_keys'

type ApiKeysStore = Record<string, Record<string, string>>

/** Load all API key overrides from DB */
export async function loadApiKeys(): Promise<ApiKeysStore> {
  try {
    const setting = await prisma.settings.findUnique({ where: { key: DB_KEY } })
    return (setting?.value as ApiKeysStore) || {}
  } catch {
    return {}
  }
}

/** Save a service's keys to DB + sync to process.env */
export async function saveServiceKeys(
  serviceId: string,
  keys: Record<string, string>
): Promise<void> {
  const store = await loadApiKeys()
  store[serviceId] = { ...(store[serviceId] || {}), ...keys }

  await prisma.settings.upsert({
    where: { key: DB_KEY },
    create: { key: DB_KEY, value: store as any },
    update: { value: store as any },
  })

  // Sync to process.env for immediate effect on all existing code
  for (const [envName, value] of Object.entries(keys)) {
    if (value) {
      process.env[envName] = value
    }
  }

  // Invalidate cached singleton clients
  invalidateAllClients()
}

/** Remove a specific key from DB + clear from process.env (falls back to original env) */
export async function removeServiceKey(
  serviceId: string,
  keyName: string
): Promise<void> {
  const store = await loadApiKeys()

  if (store[serviceId]) {
    delete store[serviceId][keyName]
    if (Object.keys(store[serviceId]).length === 0) {
      delete store[serviceId]
    }
  }

  await prisma.settings.upsert({
    where: { key: DB_KEY },
    create: { key: DB_KEY, value: store as any },
    update: { value: store as any },
  })

  // Remove from process.env — the original Railway env var will take effect
  // on next server restart. For immediate effect, we delete it.
  delete process.env[keyName]

  invalidateAllClients()
}

/** Get masked view of all keys for UI display */
export async function getMaskedKeys(): Promise<
  Record<string, Record<string, { masked: string; hasValue: boolean; source: 'db' | 'env' | 'none' }>>
> {
  const dbKeys = await loadApiKeys()
  const result: Record<string, Record<string, { masked: string; hasValue: boolean; source: 'db' | 'env' | 'none' }>> = {}

  for (const service of SERVICE_CONFIG) {
    result[service.id] = {}
    for (const key of service.keys) {
      const dbValue = dbKeys[service.id]?.[key.name]
      const envValue = process.env[key.name]

      if (dbValue) {
        result[service.id][key.name] = {
          masked: maskKey(dbValue),
          hasValue: true,
          source: 'db',
        }
      } else if (envValue) {
        result[service.id][key.name] = {
          masked: maskKey(envValue),
          hasValue: true,
          source: 'env',
        }
      } else {
        result[service.id][key.name] = {
          masked: '',
          hasValue: false,
          source: 'none',
        }
      }
    }
  }

  return result
}

function maskKey(value: string): string {
  if (!value) return ''
  if (value.length <= 8) return '••••' + value.slice(-2)
  return '••••••••' + value.slice(-4)
}

// ── Singleton invalidation registry ───────────────────────────

type InvalidateFn = () => void
const _invalidators: InvalidateFn[] = []

/** Services register a function that nulls their cached client */
export function registerClientInvalidator(fn: InvalidateFn): void {
  _invalidators.push(fn)
}

function invalidateAllClients(): void {
  for (const fn of _invalidators) {
    try { fn() } catch { /* swallow */ }
  }
  console.log(`[ApiKeys] Invalidated ${_invalidators.length} cached service clients`)
}

// ── Startup sync ──────────────────────────────────────────────

let _synced = false

/**
 * On server startup, load DB key overrides into process.env so all existing
 * code (including module-level constants) picks them up automatically.
 * Call this early in the app lifecycle.
 */
export async function syncApiKeysToEnv(): Promise<void> {
  if (_synced) return
  _synced = true

  try {
    const store = await loadApiKeys()
    let count = 0
    for (const serviceKeys of Object.values(store)) {
      for (const [envName, value] of Object.entries(serviceKeys)) {
        if (value) {
          process.env[envName] = value
          count++
        }
      }
    }
    if (count > 0) {
      console.log(`[ApiKeys] Synced ${count} DB key override(s) to process.env`)
    }
  } catch (err) {
    console.warn('[ApiKeys] Failed to sync DB keys on startup:', err)
  }
}
