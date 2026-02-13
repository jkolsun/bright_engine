import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Instantly.ai Integration
 * Auto-distribute leads to Instantly for cold email campaigns
 */

export interface InstantlyDistributionOptions {
  leadId: string
  campaignId?: string
  emailAddress?: string
  firstName?: string
  companyName?: string
  personalizationData?: Record<string, any>
}

/**
 * Send lead to Instantly campaign
 * Creates a prospect in Instantly for automated outreach
 */
export async function distributeToInstantly(
  options: InstantlyDistributionOptions
): Promise<{ success: boolean; instantlyId?: string; error?: string }> {
  try {
    if (!process.env.INSTANTLY_API_KEY) {
      console.warn('INSTANTLY_API_KEY not configured')
      return { success: false, error: 'Instantly API key not configured' }
    }

    const lead = await prisma.lead.findUnique({
      where: { id: options.leadId },
    })

    if (!lead) {
      return { success: false, error: `Lead not found: ${options.leadId}` }
    }

    // Build prospect data for Instantly
    const prospectData = {
      email: lead.email,
      first_name: lead.firstName,
      last_name: lead.lastName,
      company: lead.companyName,
      website: lead.website,
      // Custom fields
      preview_url: lead.previewUrl,
      personalization: lead.personalization,
      industry: lead.industry,
      phone: lead.phone,
    }

    // Call Instantly API to add prospect
    const response = await fetch(
      `https://api.instantly.ai/api/v1/lead/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
        },
        body: JSON.stringify({
          campaign_id: options.campaignId || process.env.INSTANTLY_CAMPAIGN_ID,
          email: lead.email,
          first_name: lead.firstName,
          last_name: lead.lastName,
          variables: prospectData,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('Instantly API error:', response.status, error)
      return { success: false, error: `Instantly API error: ${response.status}` }
    }

    const data = await response.json() as any

    // Log outbound event
    const outboundEvent = await prisma.outboundEvent.create({
      data: {
        leadId: options.leadId,
        channel: 'INSTANTLY',
        messageId: data.prospect_id || data.id,
        status: 'SENT',
        sentAt: new Date(),
        metadata: {
          instantlyProspectId: data.prospect_id || data.id,
          campaignId: options.campaignId,
        },
      },
    })

    // Log activity
    await logActivity(
      'TEXT_SENT',
      `Distributed to Instantly: ${lead.companyName}`,
      {
        leadId: options.leadId,
        metadata: {
          channel: 'INSTANTLY',
          prospectId: data.prospect_id || data.id,
        },
      }
    )

    return {
      success: true,
      instantlyId: data.prospect_id || data.id,
    }
  } catch (error) {
    console.error('Instantly distribution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Batch distribute multiple leads to Instantly
 */
export async function distributeToInstantlyBatch(
  leadIds: string[],
  campaignId?: string
) {
  const results = await Promise.allSettled(
    leadIds.map((id) =>
      distributeToInstantly({
        leadId: id,
        campaignId,
      })
    )
  )

  const successful = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'fulfilled' && (item.result as any).value.success)

  const failed = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status !== 'fulfilled' || !(item.result as any).value.success)

  return {
    successful: successful.length,
    failed: failed.length,
    total: leadIds.length,
  }
}
