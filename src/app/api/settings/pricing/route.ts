import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getPricingConfig, bustPricingCache } from '@/lib/pricing-config'

export const dynamic = 'force-dynamic'

// GET /api/settings/pricing — returns current pricing from core product
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }
    const config = await getPricingConfig()
    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// POST /api/settings/pricing — bust the 60s cache after editing core product
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }
    bustPricingCache()
    const config = await getPricingConfig()
    return NextResponse.json({ config, message: 'Cache busted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
