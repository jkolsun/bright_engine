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

    // Update lead priority to HOT
    await prisma.lead.update({
      where: { id: lead.id },
      data: { priority: 'HOT' },
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
