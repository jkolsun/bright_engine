import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/instantly/push-leads
// Actually push QUEUED leads to Instantly V2 API (one lead at a time)
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { campaignId, leadIds } = await request.json()
    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId required' }, { status: 400 })
    }

    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'INSTANTLY_API_KEY not configured' }, { status: 500 })
    }

    // Get leads to push — either specific leadIds or all QUEUED for this campaign
    const where: any = { instantlyCampaignId: campaignId }
    if (leadIds?.length) {
      where.id = { in: leadIds }
    } else {
      where.instantlyStatus = 'QUEUED'
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        companyName: true, website: true, phone: true, city: true,
        state: true, industry: true, previewUrl: true,
        personalization: true,
      },
    })

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads to push', pushed: 0 }, { status: 400 })
    }

    // Filter out leads without email (can't push to email campaign without email)
    const pushableLeads = leads.filter(l => l.email)
    const skippedNoEmail = leads.length - pushableLeads.length

    if (pushableLeads.length === 0) {
      return NextResponse.json({
        error: 'No leads have email addresses — required for Instantly',
        pushed: 0,
        skippedNoEmail,
      }, { status: 400 })
    }

    // Push leads to Instantly V2 API individually with controlled concurrency
    const CONCURRENCY = 5
    let totalPushed = 0
    const errors: string[] = []
    const successIds: string[] = []

    for (let i = 0; i < pushableLeads.length; i += CONCURRENCY) {
      const chunk = pushableLeads.slice(i, i + CONCURRENCY)

      const results = await Promise.allSettled(
        chunk.map(async (lead) => {
          const payload = formatLeadForInstantly(lead, campaignId)

          const response = await fetch('https://api.instantly.ai/api/v2/leads', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          if (!response.ok) {
            const errBody = await response.text()
            throw new Error(`${response.status}: ${errBody.substring(0, 200)}`)
          }

          return lead.id
        })
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successIds.push(result.value)
          totalPushed++
        } else {
          errors.push(result.reason?.message || String(result.reason))
        }
      }
    }

    // Update successful leads in DB
    if (successIds.length > 0) {
      await prisma.lead.updateMany({
        where: { id: { in: successIds } },
        data: {
          instantlyStatus: 'IN_SEQUENCE',
          instantlyAddedDate: new Date(),
          instantlyCurrentStep: 1,
        },
      })
    }

    // Deduplicate errors for cleaner display
    const uniqueErrors = [...new Set(errors)]

    return NextResponse.json({
      status: totalPushed > 0 ? 'success' : 'failed',
      pushed: totalPushed,
      total: pushableLeads.length,
      failed: pushableLeads.length - totalPushed,
      skippedNoEmail,
      error: totalPushed === 0 && uniqueErrors.length > 0 ? uniqueErrors[0] : undefined,
      errors: uniqueErrors.length > 0 ? uniqueErrors : undefined,
      campaignId,
    })
  } catch (error) {
    console.error('Push leads error:', error)
    return NextResponse.json(
      { error: 'Failed to push leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

function formatLeadForInstantly(
  lead: {
    email: string | null; firstName: string | null; lastName: string | null;
    companyName: string | null; website: string | null; phone: string | null;
    city: string | null; state: string | null; industry: string | null;
    previewUrl: string | null; personalization: any;
  },
  campaignId: string,
) {
  const deliveryDate = new Date()
  deliveryDate.setDate(deliveryDate.getDate() + 3)
  const deliveryStr = deliveryDate.toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })

  // Parse personalization if stored as JSON string
  let personalizationLine = ''
  try {
    const p = typeof lead.personalization === 'string'
      ? JSON.parse(lead.personalization)
      : lead.personalization
    personalizationLine = p?.firstLine || ''
  } catch {
    personalizationLine = lead.personalization || ''
  }

  return {
    email: lead.email,
    first_name: lead.firstName || '',
    last_name: lead.lastName || '',
    company_name: lead.companyName || '',
    website: lead.website || '',
    phone: lead.phone || '',
    personalization: personalizationLine,
    campaign_id: campaignId,
    skip_if_in_workspace: false,
    skip_if_in_campaign: false,
    custom_variables: {
      preview_url: lead.previewUrl || '',
      industry: formatIndustry(lead.industry),
      location: [lead.city, lead.state].filter(Boolean).join(', '),
      delivery_date: deliveryStr,
    },
  }
}

function formatIndustry(industry: string | null): string {
  if (!industry) return 'home service'
  const map: Record<string, string> = {
    RESTORATION: 'restoration', ROOFING: 'roofing', PLUMBING: 'plumbing',
    HVAC: 'HVAC', PAINTING: 'painting', LANDSCAPING: 'landscaping',
    ELECTRICAL: 'electrical', GENERAL_CONTRACTING: 'general contracting',
    CLEANING: 'cleaning', PEST_CONTROL: 'pest control', LAW_PRACTICE: 'legal',
    CONSTRUCTION: 'construction',
  }
  return map[industry] || industry.toLowerCase().replace(/_/g, ' ')
}
