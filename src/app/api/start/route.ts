import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePreviewId, getTimezoneFromState } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * POST /api/start — Public lead intake form submission (no auth required)
 * Creates a new lead and optionally kicks off enrichment.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.companyName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }
    if (!data.firstName?.trim()) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 })
    }
    if (!data.phone?.trim() && !data.email?.trim()) {
      return NextResponse.json({ error: 'Phone or email is required' }, { status: 400 })
    }

    // Normalize phone
    let phone = (data.phone || '').replace(/\D/g, '')
    if (phone && !phone.startsWith('1')) phone = '1' + phone
    if (phone) phone = '+' + phone

    // Check for duplicate by phone or email
    if (phone || data.email) {
      const existing = await prisma.lead.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(data.email ? [{ email: data.email.trim() }] : []),
          ],
        },
        select: { id: true },
      })
      if (existing) {
        // Return existing lead so they can continue onboarding
        return NextResponse.json({ lead: existing })
      }
    }

    const previewId = generatePreviewId()

    const lead = await prisma.lead.create({
      data: {
        firstName: data.firstName.trim(),
        lastName: data.lastName?.trim() || undefined,
        email: data.email?.trim() || undefined,
        phone: phone || undefined,
        companyName: data.companyName.trim(),
        industry: (data.industry?.trim() || 'GENERAL_CONTRACTING') as any,
        city: data.city?.trim() || undefined,
        state: data.state?.trim().toUpperCase() || undefined,
        timezone: getTimezoneFromState(data.state) || 'America/New_York',
        website: data.website?.trim() || undefined,
        source: 'FORM' as any,
        sourceDetail: 'public_start_form',
        previewId,
        previewUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || 'https://preview.brightautomations.org'}/preview/${previewId}`,
        previewExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    // Log event
    await prisma.leadEvent.create({
      data: {
        leadId: lead.id,
        eventType: 'STAGE_CHANGE',
        toStage: 'NEW',
        actor: 'system',
        metadata: { source: 'public_start_form' },
      },
    })

    // Notify admin
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'New Form Submission',
        message: `${data.firstName} from ${data.companyName} submitted the intake form.`,
        metadata: { leadId: lead.id, source: 'FORM' },
      },
    })

    // Queue enrichment (non-blocking)
    try {
      const { addEnrichmentJob } = await import('@/worker/queue')
      await addEnrichmentJob({
        leadId: lead.id,
        companyName: lead.companyName,
        city: lead.city || undefined,
        state: lead.state || undefined,
      })
    } catch (err) {
      console.warn('[Start] Enrichment queue failed (non-blocking):', err)
    }

    return NextResponse.json({ lead: { id: lead.id } })
  } catch (error) {
    console.error('[Start] Form submission error:', error)
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
  }
}
