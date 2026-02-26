import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

export const dynamic = 'force-dynamic'

// POST /api/preview/contact - Handle contact form submissions from preview pages
export async function POST(request: NextRequest) {
  try {
    const { previewId, name, email, phone, message } = await request.json()

    if (!previewId) {
      return NextResponse.json({ error: 'Missing previewId' }, { status: 400 })
    }
    if (!name && !email && !phone) {
      return NextResponse.json({ error: 'At least one contact field required' }, { status: 400 })
    }

    // Find lead by preview ID
    let lead = await prisma.lead.findUnique({ where: { previewId } })
    if (!lead) {
      lead = await prisma.lead.findUnique({ where: { id: previewId } })
    }
    if (!lead) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 })
    }

    // Log the contact form submission as a LeadEvent
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_CTA_CLICKED',
        metadata: {
          event: 'contact_form',
          submitterName: name || null,
          submitterEmail: email || null,
          submitterPhone: phone || null,
          submitterMessage: message || null,
        },
        actor: 'client',
      },
    })

    // Recalculate engagement score (persists score + derives priority)
    try { await calculateEngagementScore(lead.id) } catch (e) { console.warn('[Preview Contact] Score calc failed:', e) }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling preview contact form:', error)
    return NextResponse.json({ error: 'Failed to process contact form' }, { status: 500 })
  }
}
