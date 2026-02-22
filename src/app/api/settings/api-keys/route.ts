import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import {
  getMaskedKeys,
  saveServiceKeys,
  removeServiceKey,
  SERVICE_CONFIG,
} from '@/lib/api-keys'

export const dynamic = 'force-dynamic'

/**
 * GET /api/settings/api-keys
 * Returns all keys with masked values (never exposes full keys).
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const keys = await getMaskedKeys()
    return NextResponse.json({ keys, services: SERVICE_CONFIG })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch API keys', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/api-keys
 * Save one or more keys for a service.
 * Body: { service: "stripe", keys: { STRIPE_SECRET_KEY: "sk_live_..." } }
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { service, keys } = await request.json()

    if (!service || typeof service !== 'string') {
      return NextResponse.json({ error: 'service is required' }, { status: 400 })
    }
    if (!keys || typeof keys !== 'object') {
      return NextResponse.json({ error: 'keys object is required' }, { status: 400 })
    }

    // Validate service ID
    const validService = SERVICE_CONFIG.find(s => s.id === service)
    if (!validService) {
      return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 })
    }

    // Validate key names belong to this service
    const validKeyNames = new Set(validService.keys.map(k => k.name))
    for (const keyName of Object.keys(keys)) {
      if (!validKeyNames.has(keyName)) {
        return NextResponse.json({ error: `Invalid key "${keyName}" for service "${service}"` }, { status: 400 })
      }
    }

    await saveServiceKeys(service, keys)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save API keys', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/api-keys
 * Remove a specific DB override for a key (falls back to env var).
 * Body: { service: "stripe", keyName: "STRIPE_SECRET_KEY" }
 */
export async function DELETE(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { service, keyName } = await request.json()

    if (!service || !keyName) {
      return NextResponse.json({ error: 'service and keyName are required' }, { status: 400 })
    }

    await removeServiceKey(service, keyName)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to remove API key', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
