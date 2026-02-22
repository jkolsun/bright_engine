import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { getOnboarding, updateOnboarding, advanceOnboarding } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

/**
 * GET /api/clients/[id]/onboarding — Get onboarding state
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const onboarding = await getOnboarding(id)
    if (!onboarding) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ onboarding })
  } catch (error) {
    console.error('Error fetching onboarding:', error)
    return NextResponse.json({ error: 'Failed to fetch onboarding' }, { status: 500 })
  }
}

/**
 * PUT /api/clients/[id]/onboarding — Update onboarding state
 * Body: { action: 'advance', step?: number } or { action: 'update', data: Record<string, any> }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()

    if (body.action === 'advance') {
      const result = await advanceOnboarding(id, body.step)
      return NextResponse.json({ client: result })
    }

    if (body.action === 'update' && body.data) {
      const result = await updateOnboarding(id, body.data)
      return NextResponse.json({ client: result })
    }

    return NextResponse.json({ error: 'Invalid action. Use "advance" or "update".' }, { status: 400 })
  } catch (error) {
    console.error('Error updating onboarding:', error)
    return NextResponse.json(
      { error: 'Failed to update onboarding', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
