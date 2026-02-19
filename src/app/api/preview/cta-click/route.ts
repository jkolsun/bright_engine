import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Rate limit: Skip Close Engine trigger if CTA already clicked in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentClick = await prisma.leadEvent.findFirst({
      where: {
        leadId: lead.id,
        eventType: 'PREVIEW_CTA_CLICKED',
        createdAt: { gte: oneHourAgo },
      },
    })

    // Always log the click event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'PREVIEW_CTA_CLICKED',
        metadata: { source: 'cta_banner', previewId },
        actor: 'client',
      },
    })

    // Update lead priority AND status to HOT
    await prisma.lead.update({
      where: { id: lead.id },
      data: { priority: 'HOT', status: 'HOT_LEAD' },
    })

    // Create HOT_LEAD notification
    await prisma.notification.create({
      data: {
        type: 'HOT_LEAD',
        title: 'Preview CTA Clicked!',
        message: `${lead.firstName} at ${lead.companyName} clicked "Get Started" on their preview`,
        metadata: { leadId: lead.id, previewId, source: 'cta_banner' },
      },
    })

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

    // Only trigger Close Engine if not recently clicked
    if (!recentClick) {
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
