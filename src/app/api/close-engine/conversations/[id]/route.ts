import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET — Return conversation with lead, messages, pending actions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.closeEngineConversation.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Load messages for this lead (last 50, chronological)
    const messages = await prisma.message.findMany({
      where: { leadId: conversation.leadId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    // Load pending actions for this conversation
    const pendingActions = await prisma.pendingAction.findMany({
      where: { conversationId: id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      ...conversation,
      messages,
      pendingActions,
    })
  } catch (error) {
    console.error('[CloseEngine Conversations API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// PUT — Update autonomy level or notes
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { autonomyLevel, notes } = body

    // Validate autonomy level if provided
    const validLevels = ['FULL_AUTO', 'SEMI_AUTO', 'MANUAL']
    if (autonomyLevel && !validLevels.includes(autonomyLevel)) {
      return NextResponse.json(
        { error: `Invalid autonomyLevel. Must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      )
    }

    const conversation = await prisma.closeEngineConversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (autonomyLevel) updateData.autonomyLevel = autonomyLevel
    if (notes !== undefined) updateData.closedLostReason = notes // TODO: add dedicated notes field to schema

    const updated = await prisma.closeEngineConversation.update({
      where: { id },
      data: updateData,
    })

    // Keep lead.autonomyLevel in sync
    if (autonomyLevel) {
      await prisma.lead.update({
        where: { id: conversation.leadId },
        data: { autonomyLevel },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[CloseEngine Conversations API] PUT error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
