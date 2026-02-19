import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/instantly/assign-campaign — Assign leads to an Instantly campaign
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadIds, campaignId, campaignName, pushImmediately } = await request.json()
    if (!leadIds?.length || !campaignId) {
      return NextResponse.json({ error: 'leadIds and campaignId required' }, { status: 400 })
    }

    // Validate leads have required fields for Instantly (email + preview URL)
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, email: true, previewUrl: true, firstName: true, companyName: true },
    })

    const validLeadIds = leads
      .filter((l) => l.email && l.previewUrl)
      .map((l) => l.id)

    const skipped = leads.filter((l) => !l.email || !l.previewUrl)

    if (validLeadIds.length === 0) {
      return NextResponse.json({
        error: 'No leads have both email and preview URL — required for Instantly campaigns',
        skipped: skipped.length,
      }, { status: 400 })
    }

    // Queue valid leads — instantlyAddedDate is set later when actually pushed to Instantly
    const updated = await prisma.lead.updateMany({
      where: { id: { in: validLeadIds } },
      data: {
        instantlyCampaignId: campaignId,
        instantlyStatus: 'QUEUED',
      },
    })

    // Optionally push to Instantly immediately
    let pushResult: { pushed: number; failed: number; errors?: string[] } | null = null
    if (pushImmediately) {
      const apiKey = process.env.INSTANTLY_API_KEY
      if (apiKey) {
        try {
          // Build lead data for Instantly V2 API
          const fullLeads = await prisma.lead.findMany({
            where: { id: { in: validLeadIds } },
            select: {
              id: true, email: true, firstName: true, lastName: true,
              companyName: true, website: true, phone: true, city: true,
              state: true, industry: true, previewUrl: true, personalization: true,
            },
          })

          const BATCH_SIZE = 100
          let totalPushed = 0
          const pushErrors: string[] = []

          for (let i = 0; i < fullLeads.length; i += BATCH_SIZE) {
            const batchLeads = fullLeads.slice(i, i + BATCH_SIZE)
            const batchIds = batchLeads.map(l => l.id)

            const instantlyBatch = batchLeads.map(lead => {
              const deliveryDate = new Date()
              deliveryDate.setDate(deliveryDate.getDate() + 3)
              let personalizationLine = ''
              try {
                const p = typeof lead.personalization === 'string' ? JSON.parse(lead.personalization) : lead.personalization
                personalizationLine = p?.firstLine || ''
              } catch { personalizationLine = lead.personalization || '' }

              return {
                email: lead.email,
                first_name: lead.firstName || '',
                last_name: lead.lastName || '',
                company_name: lead.companyName || '',
                website: lead.website || '',
                phone: lead.phone || '',
                preview_url: lead.previewUrl || '',
                personalization: personalizationLine,
                industry: lead.industry?.toLowerCase().replace(/_/g, ' ') || 'home service',
                location: [lead.city, lead.state].filter(Boolean).join(', '),
                delivery_date: deliveryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
              }
            })

            try {
              const res = await fetch('https://api.instantly.ai/api/v2/leads', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  campaign_id: campaignId,
                  leads: instantlyBatch,
                  skip_if_in_workspace: false,
                  skip_if_in_campaign: false,
                }),
              })
              if (!res.ok) throw new Error(`Instantly API ${res.status}`)

              await prisma.lead.updateMany({
                where: { id: { in: batchIds } },
                data: { instantlyStatus: 'IN_SEQUENCE', instantlyAddedDate: new Date(), instantlyCurrentStep: 1 },
              })
              totalPushed += batchLeads.length
            } catch (err) {
              pushErrors.push(err instanceof Error ? err.message : String(err))
            }
          }

          pushResult = { pushed: totalPushed, failed: fullLeads.length - totalPushed, errors: pushErrors.length > 0 ? pushErrors : undefined }
        } catch (err) {
          pushResult = { pushed: 0, failed: validLeadIds.length, errors: [err instanceof Error ? err.message : String(err)] }
        }
      } else {
        pushResult = { pushed: 0, failed: validLeadIds.length, errors: ['INSTANTLY_API_KEY not configured'] }
      }
    }

    return NextResponse.json({
      updated: updated.count,
      assignedLeadIds: validLeadIds,
      skipped: skipped.length,
      skippedReason: skipped.length > 0 ? 'Missing email or preview URL' : undefined,
      campaignName: campaignName || campaignId,
      pushResult,
    })
  } catch (error) {
    console.error('Assign campaign error:', error)
    return NextResponse.json({ error: 'Failed to assign to campaign' }, { status: 500 })
  }
}
