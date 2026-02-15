import { prisma } from './db'
import { Anthropic } from '@anthropic-ai/sdk'
import { logActivity } from './logging'

/**
 * Rep Script Generator
 * Generates dynamic calling scripts for reps
 * Based on company info, engagement level, and conversation stage
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface RepScript {
  opening: string // How to start the call
  hook: string // The main value prop / angle
  discovery: string // Questions to uncover pain points
  objectionHandlers: {
    [key: string]: string // Common objections and how to handle
  }
  closeAttempt: string // How to move to next step
  notes: string // Rep notes (tone, approach, timing)
  tokensCost: number
}

/**
 * Generate a calling script for a lead
 */
export async function generateRepScript(leadId: string): Promise<RepScript | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedTo: true,
        events: true,
      },
    })

    if (!lead) {
      console.error(`Lead not found: ${leadId}`)
      return null
    }

    // Gather context
    const industry = lead.industry.toLowerCase().replace(/_/g, ' ')
    const engagementEvents = lead.events.length
    const personalizationHook = lead.personalization || ''
    const rating = lead.enrichedRating || 4.5
    const reviews = lead.enrichedReviews || 50

    const prompt = `You are a sales script expert. Generate a phone calling script for a rep calling ${lead.companyName} (${industry}) in ${lead.city}, ${lead.state}.

Lead Context:
- Company: ${lead.companyName}
- Industry: ${industry}
- Previous engagement: ${engagementEvents} touch points
- Personalized hook: "${personalizationHook}"
- Rating: ${rating}/5 (${reviews} reviews)
- Contact: ${lead.firstName} at ${lead.email} / ${lead.phone}

Generate a JSON script with these sections:
{
  "opening": "...",
  "hook": "...",
  "discovery": "...",
  "objectionHandlers": {
    "too expensive": "...",
    "not interested": "...",
    "talking to competitors": "...",
    "bad timing": "..."
  },
  "closeAttempt": "...",
  "notes": "..."
}

Requirements:
- Opening: Friendly, brief intro + permission to continue (20-30 words)
- Hook: Reference the personalized insight, show understanding of their business
- Discovery: 2-3 questions to uncover pain points (not product pitch)
- Objection Handlers: Specific responses to common objections
- Close Attempt: Soft ask for a brief meeting or next step
- Notes: Rep guidance (tone, pace, when to pause, when to be bold)

Be conversational, not robotic. Assume the rep is experienced but needs structure.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Haiku for cost
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON
    let parsed
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsed = JSON.parse(jsonMatch[0])
    } catch (err) {
      console.error('Failed to parse script response:', responseText, err)
      return null
    }

    const result: RepScript = {
      opening: parsed.opening || '',
      hook: parsed.hook || '',
      discovery: parsed.discovery || '',
      objectionHandlers: parsed.objectionHandlers || {},
      closeAttempt: parsed.closeAttempt || '',
      notes: parsed.notes || '',
      tokensCost:
        (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008,
    }

    // Store script in callScript field (used by dialer)
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        callScript: JSON.stringify(result, null, 2),
      },
    })

    // Log activity
    await logActivity(
      'SCORE_UPDATE', // Using existing action type
      `Generated calling script for ${lead.companyName}`,
      {
        leadId,
        tokenCost: result.tokensCost,
        metadata: {
          scriptType: 'call',
          hook: result.hook,
        },
      }
    )

    return result
  } catch (error) {
    console.error('Rep script generation error:', error)
    return null
  }
}

/**
 * Batch generate scripts for multiple leads
 */
export async function generateScriptsBatch(leadIds: string[]) {
  const results = await Promise.allSettled(
    leadIds.map((id) => generateRepScript(id))
  )

  const successful = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'fulfilled' && item.result.value)

  const failed = results.filter((r) => r.status === 'rejected').length

  const totalTokenCost = successful.reduce(
    (sum, item) =>
      sum +
      ((item.result as PromiseFulfilledResult<any>).value?.tokensCost || 0),
    0
  )

  return {
    successful: successful.length,
    failed,
    total: leadIds.length,
    totalTokenCost,
  }
}
