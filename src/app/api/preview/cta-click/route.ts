import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pushToRep, pushToAllAdmins } from '@/lib/dialer-events'
import { pushToMessages } from '@/lib/messages-v2-events'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { previewId, selectedTemplate } = await request.json()

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

    // Always log the click event (include selected template if provided)
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_CTA_CLICKED',
        metadata: { source: 'cta_banner', previewId, ...(selectedTemplate ? { selectedTemplate } : {}) },
        actor: 'client',
      },
    })

    // Store the selected template on the lead record
    if (selectedTemplate) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { selectedTemplate },
      })
    }

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

    // CTA click = always HOT. Set status immediately (engagement scoring
    // also runs inside triggerCloseEngine, so no need to recalculate here)
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'HOT_LEAD', priority: 'HOT' },
    })

    // Send urgent email notification to admin via Resend
    try {
      const { sendEmail } = await import('@/lib/resend')
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'andrew@brightautomations.net',
        subject: `${activeCall ? '📞 ' : ''}Hot Lead: ${lead.companyName} clicked CTA`,
        html: `<p><strong>${lead.firstName}</strong> at <strong>${lead.companyName}</strong> clicked "Get Started" on their preview site.${activeCall ? ' <strong>(During active call)</strong>' : ''}</p>
               <p>Phone: ${lead.phone} | Email: ${lead.email || 'N/A'}</p>
               <p><a href="${process.env.BASE_URL || 'https://app.brightautomations.net'}/admin/messages?leadId=${lead.id}">View conversation</a></p>`,
        trigger: 'hot_lead_admin_notification',
      })
    } catch (emailErr) {
      console.error('[Preview CTA] Admin email notification failed:', emailErr)
    }

    // Push CTA click to Messages V2
    try { pushToMessages({ type: 'PREVIEW_CLICK', data: { leadId: lead.id, eventType: 'PREVIEW_CTA_CLICKED' }, timestamp: new Date().toISOString() }) } catch {}

    // Always trigger Close Engine so the lead appears in the Messages inbox.
    // During active calls, skip the automated first message (rep is already talking to them).
    try {
      const { triggerCloseEngine } = await import('@/lib/close-engine')
      await triggerCloseEngine({
        leadId: lead.id,
        entryPoint: 'PREVIEW_CTA',
        skipFirstMessage: !!activeCall,
      })
    } catch (err) {
      console.error('[Preview CTA] Close Engine trigger failed:', err)
    }

    // ── SMS Campaign CTA Click Tracking ──
    // If this lead came from an SMS campaign, update funnel stage to CTA_CLICKED
    try {
      const smsCampaignLead = await prisma.smsCampaignLead.findFirst({
        where: {
          leadId: lead.id,
          funnelStage: { in: ['TEXTED', 'CLICKED'] },
        },
        include: { campaign: { select: { id: true, name: true } } },
      })

      if (smsCampaignLead) {
        // Update SmsCampaignLead — CTA click counts as a CLICKED event
        await prisma.smsCampaignLead.update({
          where: { id: smsCampaignLead.id },
          data: {
            funnelStage: 'CLICKED',
            previewClickedAt: smsCampaignLead.funnelStage === 'TEXTED' ? new Date() : undefined,
            previewClickCount: { increment: 1 },
          },
        })

        // Update Lead funnel stage
        await prisma.lead.update({
          where: { id: lead.id },
          data: { smsFunnelStage: 'CLICKED', priority: 'HOT' },
        })

        // Increment SmsCampaign click count — only on first click (TEXTED → CLICKED transition)
        if (smsCampaignLead.funnelStage === 'TEXTED') {
          await prisma.smsCampaign.update({
            where: { id: smsCampaignLead.campaignId },
            data: { clickCount: { increment: 1 } },
          })
        }

        // Create LeadEvent for CTA click from SMS campaign
        await prisma.leadEvent.create({
          data: {
            leadId: lead.id,
            eventType: 'SMS_CLICKED',
            metadata: {
              campaignId: smsCampaignLead.campaignId,
              campaignName: smsCampaignLead.campaign.name,
              source: 'sms_campaign',
              selectedTemplate: selectedTemplate || null,
            },
            actor: 'system',
          },
        })

        // SSE: notify rep and admins about CTA click escalation
        if (smsCampaignLead.assignedRepId) {
          try {
            const sseEvent = {
              type: 'HOT_LEAD' as const,
              data: {
                leadId: lead.id,
                companyName: lead.companyName,
                phone: lead.phone,
                city: lead.city,
                state: lead.state,
                campaignName: smsCampaignLead.campaign.name,
                action: 'CTA_CLICKED',
                clickedAt: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
            }
            pushToRep(smsCampaignLead.assignedRepId, sseEvent)
            pushToAllAdmins(sseEvent)
          } catch (sseErr) {
            console.warn('[SMS-CTA] SSE push failed:', sseErr)
          }
        }
      }
    } catch (smsErr) {
      console.error('[SMS-CTA] Error processing SMS campaign CTA click:', smsErr)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Preview CTA] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
