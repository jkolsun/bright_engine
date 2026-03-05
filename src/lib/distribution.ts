import { prisma } from './db'
import { addRepTask } from './rep-queue'
import { logActivity } from './logging'

/**
 * Distribution Service
 * Final step of import pipeline: sends leads to SMS queue + rep queue
 */

export type DistributionChannel = 'SMS_QUEUE' | 'REP_QUEUE' | 'BOTH'

export interface DistributionOptions {
  leadId: string
  channel: DistributionChannel
  repId?: string
}

/**
 * Distribute a lead to specified channel(s)
 * This is the final step after enrichment, preview, personalization, and scripts
 */
export async function distributeLead(
  options: DistributionOptions
): Promise<{
  success: boolean
  repQueue?: { success: boolean; taskId?: string; error?: string }
  errors?: string[]
}> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: options.leadId },
    })

    if (!lead) {
      return {
        success: false,
        errors: [`Lead not found: ${options.leadId}`],
      }
    }

    // Check preview URL exists (critical requirement)
    if (!lead.previewUrl) {
      return {
        success: false,
        errors: [
          `Lead ${options.leadId} has no preview URL - cannot distribute`,
        ],
      }
    }

    const results: any = {}
    const errors: string[] = []

    // Add to rep queue (human follow-up)
    if (
      options.channel === 'REP_QUEUE' ||
      options.channel === 'BOTH'
    ) {
      try {
        const task = await addRepTask({
          leadId: options.leadId,
          repId: options.repId,
          priority: lead.priority === 'HOT' ? 'URGENT' : 'MEDIUM',
          taskType: 'INITIAL_CALL',
        })
        results.repQueue = {
          success: !!task,
          taskId: task?.id,
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unknown error'
        results.repQueue = { success: false, error }
        errors.push(`Rep Queue: ${error}`)
      }
    }

    // Update lead status to show it's been distributed
    await prisma.lead.update({
      where: { id: options.leadId },
      data: {
        status: 'BUILDING', // In the funnel, being worked on
      },
    })

    // Log distribution
    const channels = [
      options.channel === 'BOTH'
        ? 'SMS Queue + Rep Queue'
        : options.channel,
    ].join(', ')

    await logActivity(
      'TEXT_SENT',
      `Distributed ${lead.companyName} to ${channels}`,
      {
        leadId: options.leadId,
        metadata: {
          channels,
          repQueue: results.repQueue?.success,
        },
      }
    )

    return {
      success: errors.length === 0,
      ...results,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Distribution error:', error)
    return {
      success: false,
      errors: [
        error instanceof Error ? error.message : 'Unknown distribution error',
      ],
    }
  }
}

/**
 * Batch distribute multiple leads
 */
export async function distributeLeadsBatch(
  leadIds: string[],
  channel: DistributionChannel,
  repId?: string
) {
  const results = await Promise.allSettled(
    leadIds.map((id) =>
      distributeLead({
        leadId: id,
        channel,
        repId,
      })
    )
  )

  const successful = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter(
      (item) =>
        item.result.status === 'fulfilled' &&
        item.result.value.success
    )

  const failed = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter(
      (item) =>
        item.result.status === 'rejected' ||
        (item.result.status === 'fulfilled' && !item.result.value.success)
    )

  return {
    successful: successful.length,
    failed: failed.length,
    total: leadIds.length,
    details: {
      successful: successful.map((s) => s.leadId),
      failed: failed.map((f) => f.leadId),
    },
  }
}
