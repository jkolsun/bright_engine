import { NextRequest, NextResponse } from 'next/server'
import { generateRetentionMessage } from '@/lib/retention-messages'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/retention-message — Generate an adaptive retention message for a client
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { clientId, touchpointDay, guidance } = await request.json()

    if (!clientId || !touchpointDay) {
      return NextResponse.json({ error: 'clientId and touchpointDay required' }, { status: 400 })
    }

    const result = await generateRetentionMessage(clientId, touchpointDay, guidance)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Retention message error:', error)
    return NextResponse.json(
      { error: 'Failed to generate retention message' },
      { status: 500 }
    )
  }
}
