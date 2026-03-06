import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { markOptedIn } from '@/lib/sms-campaign-service'

export const dynamic = 'force-dynamic'

// POST /api/campaigns/[id]/opt-in — Mark a lead as opted in
// Accepts both ADMIN and REP auth (reps can mark opt-ins during calls)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Await params even though we don't use id directly — validates the route
    await params

    const body = await request.json()
    const { campaignLeadId, method } = body

    if (!campaignLeadId) {
      return NextResponse.json({ error: 'campaignLeadId is required' }, { status: 400 })
    }

    const validMethods = ['verbal_rep_call', 'text_reply_yes']
    if (!method || !validMethods.includes(method)) {
      return NextResponse.json(
        { error: `method must be one of: ${validMethods.join(', ')}` },
        { status: 400 }
      )
    }

    await markOptedIn(campaignLeadId, method)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking opt-in:', error)
    return NextResponse.json(
      { error: 'Failed to mark opt-in', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
