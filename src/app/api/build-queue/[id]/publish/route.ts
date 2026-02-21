import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/build-queue/[id]/publish
 * Creates a SITE_PUBLISH approval that must be approved before the site goes live.
 * Body: { domain?: string, notes?: string }
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
        siteHtml: true,
        city: true,
        state: true,
        industry: true,
        client: { select: { id: true } },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check for duplicate pending approvals
    const existing = await prisma.approval.findFirst({
      where: { leadId: id, gate: 'SITE_PUBLISH', status: 'PENDING' },
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        approval: { id: existing.id, gate: existing.gate },
        message: 'Publish approval already pending.',
      })
    }

    const previewLink = lead.previewUrl || (lead.previewId ? `/preview/${lead.previewId}` : 'No preview available')
    const location = [lead.city, lead.state].filter(Boolean).join(', ')

    // Move lead to LAUNCHING while awaiting approval
    await prisma.lead.update({
      where: { id },
      data: { buildStep: 'LAUNCHING' },
    })

    const approval = await prisma.approval.create({
      data: {
        gate: 'SITE_PUBLISH',
        title: `Publish Site: ${lead.companyName}`,
        description: `Ready to publish the site for ${lead.companyName}${location ? ` (${location})` : ''}.\n\nPreview: ${previewLink}${body.domain ? `\nDomain: ${body.domain}` : ''}${body.notes ? `\nNotes: ${body.notes}` : ''}`,
        draftContent: previewLink,
        leadId: id,
        clientId: lead.client?.id || undefined,
        requestedBy: session.name || session.email || 'admin',
        priority: 'HIGH',
        metadata: {
          previewUrl: previewLink,
          domain: body.domain || null,
          companyName: lead.companyName,
          hasSiteHtml: !!lead.siteHtml,
        },
      },
    })

    return NextResponse.json({
      success: true,
      approval: { id: approval.id, gate: approval.gate },
      message: `Publish approval created for ${lead.companyName}. Check the Approvals page.`,
    })
  } catch (error) {
    console.error('Error creating publish approval:', error)
    return NextResponse.json({ error: 'Failed to create publish approval' }, { status: 500 })
  }
}
