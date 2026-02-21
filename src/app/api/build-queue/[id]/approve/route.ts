import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/build-queue/[id]/approve
 * Jared approves the build → creates an Approval for Andrew.
 * Body: { notes?: "Optional notes about this build" }
 */
export async function POST(
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
    const body = await request.json().catch(() => ({}))

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        previewUrl: true,
        previewId: true,
        buildStep: true,
        buildReadinessScore: true,
        buildNotes: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Save notes if provided
    if (body.notes !== undefined) {
      await prisma.lead.update({
        where: { id },
        data: { buildNotes: body.notes },
      })
    }

    // Move to QA_APPROVED and create Approval for Andrew
    await prisma.lead.update({
      where: { id },
      data: { buildStep: 'QA_APPROVED' },
    })

    const previewLink = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : 'No preview available')

    const approval = await prisma.approval.create({
      data: {
        gate: 'SEND_PREVIEW',
        title: `Site Preview: ${lead.companyName}`,
        description: `Jared approved the site build for ${lead.companyName}. Readiness score: ${lead.buildReadinessScore || 'N/A'}/100.\n\nPreview: ${previewLink}\n\n${body.notes ? `Notes: ${body.notes}` : 'No notes.'}`,
        draftContent: previewLink,
        leadId: id,
        requestedBy: session.name || session.email || 'admin',
        priority: 'HIGH',
        metadata: {
          previewUrl: previewLink,
          readinessScore: lead.buildReadinessScore,
          buildNotes: body.notes || lead.buildNotes,
        },
      },
    })

    return NextResponse.json({
      success: true,
      approval: { id: approval.id, gate: approval.gate },
      message: `Build approved. Waiting for Andrew's review.`,
    })
  } catch (error) {
    console.error('Error approving build:', error)
    return NextResponse.json({ error: 'Failed to approve build' }, { status: 500 })
  }
}
