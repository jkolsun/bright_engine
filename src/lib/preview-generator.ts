import { prisma } from './db'
import { v4 as uuidv4 } from 'uuid'

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

  // Generate unique preview ID
  const previewId = uuidv4()

  // Build preview URL (must be live and accessible)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brightengine-production.up.railway.app'
  const previewUrl = `${baseUrl}/preview/${previewId}`

  // Preview expires in 30 days
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

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
  daysFromNow: number = 30
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
