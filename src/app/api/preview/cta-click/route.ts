import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { previewId } = await request.json()

    if (!previewId) {
      return NextResponse.json({ error: 'previewId required' }, { status: 400 })
    }

    // Find lead by previewId
    const lead = await prisma.lead.findUnique({
      where: { previewId },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Always log the click event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_CTA_CLICKED',
        metadata: { source: 'cta_banner', previewId },
        actor: 'client',
      },
    })

    // Check for active dialer call BEFORE deciding on hot lead promotion
    let activeCall: { id: string; repId: string } | null = null
    try {
      activeCall = await prisma.dialerCall.findFirst({
        where: {
          leadId: lead.id,
          endedAt: null,
          status: { in: ['INITIATED', 'RINGING', 'CONNECTED'] },
        },
        select: { id: true, repId: true },
        orderBy: { startedAt: 'desc' },
      })

      if (activeCall) {
        await prisma.dialerCall.update({
          where: { id: activeCall.id },
          data: { ctaClickedDuringCall: true },
        })
        const sseEvent = {
          type: 'CTA_CLICKED' as const,
          data: { callId: activeCall.id, leadId: lead.id, source: 'cta_banner' },
          timestamp: new Date().toISOString(),
        }
        pushToRep(activeCall.repId, sseEvent)
        pushToAllAdmins({ ...sseEvent, data: { ...sseEvent.data, repId: activeCall.repId } })
      }
    } catch (dialerErr) {
      console.warn('[Preview CTA] Dialer SSE push failed:', dialerErr)
    }

    // Recalculate engagement score (persists score + derives priority)
    let scoreResult: Awaited<ReturnType<typeof calculateEngagementScore>> | null = null
    try { scoreResult = await calculateEngagementScore(lead.id) } catch (e) { console.warn('[Preview CTA] Score calc failed:', e) }

    // Only promote status, send admin email, and trigger Close Engine
    // for organic engagement (Bug A fix). During active calls, the rep told the lead to click.
    if (!activeCall) {
      // If score crossed to HOT, set status to HOT_LEAD
      if (scoreResult?.priorityChanged && scoreResult.newPriority === 'HOT') {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: 'HOT_LEAD' },
        })
      }

      // Send urgent email notification to admin via Resend
      try {
        const { sendEmail } = await import('@/lib/resend')
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'andrew@brightautomations.net',
          subject: `Hot Lead: ${lead.companyName} clicked CTA`,
          html: `<p><strong>${lead.firstName}</strong> at <strong>${lead.companyName}</strong> clicked "Get Started" on their preview site.</p>
                 <p>Phone: ${lead.phone} | Email: ${lead.email || 'N/A'}</p>
                 <p><a href="${process.env.BASE_URL || 'https://app.brightautomations.net'}/admin/messages">View conversation</a></p>`,
          trigger: 'hot_lead_admin_notification',
        })
      } catch (emailErr) {
        console.error('[Preview CTA] Admin email notification failed:', emailErr)
      }

      // Trigger Close Engine (atomic guard inside prevents double-fire)
      try {
        const { triggerCloseEngine } = await import('@/lib/close-engine')
        await triggerCloseEngine({
          leadId: lead.id,
          entryPoint: 'PREVIEW_CTA',
        })
      } catch (err) {
        console.error('[Preview CTA] Close Engine trigger failed:', err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Preview CTA] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
