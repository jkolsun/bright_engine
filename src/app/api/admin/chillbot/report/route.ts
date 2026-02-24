import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const CHILLBOT_USER_ID = 'cmm1247a90000kpev7z8scpzs'

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CHILLBOT')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { actionType, description, metadata, leadId, clientId } = body

    const validTypes = ['CHILLBOT_DIAGNOSTIC', 'CHILLBOT_REPORT', 'CHILLBOT_ALERT']
    if (!actionType || !validTypes.includes(actionType)) {
      return NextResponse.json(
        { error: `Invalid actionType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'description is required and must be a string' },
        { status: 400 }
      )
    }

    const activity = await prisma.clawdbotActivity.create({
      data: {
        actionType: actionType as any,
        description: description.substring(0, 500),
        repId: CHILLBOT_USER_ID,
        metadata: metadata || undefined,
        leadId: leadId || undefined,
        clientId: clientId || undefined,
        tokenCost: null,
      },
    })

    return NextResponse.json({
      success: true,
      activityId: activity.id,
    })
  } catch (error) {
    console.error('[ChillBot Report] Error:', error)
    return NextResponse.json(
      { error: 'Report failed', detail: String(error) },
      { status: 500 }
    )
  }
}
