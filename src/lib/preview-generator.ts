import { prisma } from './db'
import { generatePreviewId } from './utils'

// BUG Q.2: Configurable preview expiration (default 7 days)
const DEFAULT_PREVIEW_EXPIRATION_DAYS = 7

async function getPreviewExpirationDays(): Promise<number> {
  try {
    const setting = await prisma.settings.findFirst({
      where: { key: 'preview_expiration_days' },
    })
    if (setting?.value) {
      const days = typeof setting.value === 'string' ? parseInt(setting.value as string, 10) : Number(setting.value)
      if (!isNaN(days) && days > 0) return days
    }
  } catch { /* use default */ }
  return DEFAULT_PREVIEW_EXPIRATION_DAYS
}

/**
 * Preview Generation Service
 * Creates live preview URLs for leads
 * These URLs must be live BEFORE personalization runs
 */

export interface PreviewGenerationOptions {
  leadId: string
  clientId?: string
  templateId?: string // Use client's template if available
}

/**
 * Generate a preview for a lead
 * Creates a unique preview URL and stores it
 */
export async function generatePreview(
  options: PreviewGenerationOptions
): Promise<{
  previewId: string
  previewUrl: string
  expiresAt: Date
}> {
  const { leadId, clientId } = options

  // Check if lead already has a previewId
  const existingLead = await prisma.lead.findUnique({
    where: { id: leadId }
  })
  if (!existingLead) throw new Error(`Lead not found: ${leadId}`)

  // If lead already has a previewId, don't overwrite it
  if (existingLead.previewId && existingLead.previewUrl) {
    // Just ensure expiration is set
    if (!existingLead.previewExpiresAt) {
      const days = await getPreviewExpirationDays()
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      await prisma.lead.update({
        where: { id: leadId },
        data: { previewExpiresAt: expiresAt }
      })
    }
    try {
      await prisma.clawdbotActivity.create({
        data: {
          actionType: 'PREVIEW_GENERATED',
          description: `Preview already exists for ${existingLead.companyName}`,
          leadId,
          metadata: {
            previewId: existingLead.previewId,
            existing: true
          },
        },
      })
    } catch (err) {
      console.error('Failed to log:', err)
    }
    return {
      previewId: existingLead.previewId,
      previewUrl: existingLead.previewUrl,
      expiresAt: existingLead.previewExpiresAt || new Date(Date.now() + (await getPreviewExpirationDays()) * 24 * 60 * 60 * 1000),
    }
  }

  // Generate new preview ID only if none exists
  const previewId = generatePreviewId()

  // Build preview URL (must be live and accessible)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'
  const previewUrl = `${baseUrl}/preview/${previewId}`

  // BUG Q.2: Configurable preview expiration (reads from Settings table)
  const expirationDays = await getPreviewExpirationDays()
  const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)

  // Store in database
  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      previewId,
      previewUrl,
      previewExpiresAt: expiresAt,
      status: 'QUALIFIED', // Move from NEW to QUALIFIED after preview generation
    },
  })

  // Log activity (simple logging without circular imports)
  try {
    await prisma.clawdbotActivity.create({
      data: {
        actionType: 'PREVIEW_GENERATED',
        description: `Generated preview for ${lead.companyName}`,
        leadId,
        metadata: {
          previewId,
          expiresAt,
        },
      },
    })
  } catch (err) {
    console.error('Failed to log preview generation:', err)
  }

  return {
    previewId,
    previewUrl,
    expiresAt,
  }
}

/**
 * Batch generate previews for multiple leads
 */
export async function generatePreviewsBatch(leadIds: string[]) {
  const results = await Promise.allSettled(
    leadIds.map((id) =>
      generatePreview({ leadId: id })
    )
  )

  const successful = results
    .map((r, i) => ({ leadId: leadIds[i], result: r }))
    .filter((item) => item.result.status === 'fulfilled')
    .map((item) => ({
      leadId: item.leadId,
      ...(item.result as PromiseFulfilledResult<any>).value,
    }))

  const failed = results
    .map((r, i) => ({ leadId: leadIds[i], result: r }))
    .filter((item) => item.result.status === 'rejected')
    .map((item) => ({
      leadId: item.leadId,
      error: (item.result as PromiseRejectedResult).reason,
    }))

  return {
    successful,
    failed,
    summary: {
      total: leadIds.length,
      successCount: successful.length,
      failureCount: failed.length,
    },
  }
}

/**
 * Check if preview has expired
 */
export async function isPreviewExpired(previewId: string): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { previewId },
  })

  if (!lead || !lead.previewExpiresAt) return true

  return new Date() > lead.previewExpiresAt
}

/**
 * Refresh preview expiration for a lead
 */
export async function refreshPreviewExpiration(
  leadId: string,
  daysFromNow: number = 7
) {
  const expiresAt = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      previewExpiresAt: expiresAt,
    },
  })

  return expiresAt
}
