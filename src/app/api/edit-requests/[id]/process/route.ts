import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { handleEditRequest } from '@/lib/edit-request-handler'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // AI editing can take minutes

/**
 * POST /api/edit-requests/[id]/process
 *
 * Triggers AI edit processing for a new/stuck edit request.
 * Used from the admin Edit Queue UI to manually kick off processing.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const editRequest = await prisma.editRequest.findUnique({
      where: { id },
      include: { client: true },
    })
    if (!editRequest) {
      return NextResponse.json({ error: 'Edit request not found' }, { status: 404 })
    }

    // Only process new or failed edits
    if (!['new', 'ai_processing'].includes(editRequest.status) && editRequest.editFlowState !== 'failed') {
      return NextResponse.json(
        { error: `Cannot process edit in state: ${editRequest.status}/${editRequest.editFlowState}` },
        { status: 400 }
      )
    }

    // Allow admin to override complexity
    const body = await request.json().catch(() => ({}))
    const complexity = body.complexity || editRequest.complexityTier || 'medium'

    // Fire off the edit handler
    await handleEditRequest({
      clientId: editRequest.clientId,
      editRequestId: id,
      instruction: editRequest.aiInterpretation || editRequest.requestText,
      complexity: complexity as 'simple' | 'medium' | 'complex',
    })

    const updated = await prisma.editRequest.findUnique({ where: { id } })
    return NextResponse.json({ editRequest: updated, message: 'Processing started' })
  } catch (error) {
    console.error('Error processing edit request:', error)
    return NextResponse.json({ error: 'Failed to process edit request' }, { status: 500 })
  }
}
