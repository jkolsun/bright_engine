import { prisma } from './db'
import { Anthropic } from '@anthropic-ai/sdk'
import { logActivity } from './logging'

/**
 * AI Personalization Service
 * Generates custom hooks and first lines for each lead
 * Uses Haiku model for cost efficiency
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface PersonalizationResult {
  firstLine: string
  hook: string
  angle: string // What we're emphasizing (pain point, opportunity, etc.)
  tokensCost: number
}

/**
 * Generate personalized first line for a lead
 * Must be called AFTER preview URL is generated
 */
export async function generatePersonalization(
  leadId: string
): Promise<PersonalizationResult | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      console.error(`Lead not found: ${leadId}`)
      return null
    }

    // Check preview URL exists (MUST be live before personalization)
    if (!lead.previewUrl) {
      console.error(
        `Lead ${leadId} has no preview URL - cannot personalize`
      )
      return null
    }

    // Build context for AI
    const services = Array.isArray(lead.enrichedServices)
      ? (lead.enrichedServices as string[])
      : []
    const servicesText =
      services.length > 0
        ? `Services: ${services.join(', ')}`
        : 'Services: Unknown'

    const prompt = `You are a cold email expert generating a personalized first line for an outreach to a ${lead.industry.toLowerCase()} company.

Company: ${lead.companyName}
Location: ${lead.city || 'Unknown'}, ${lead.state || 'Unknown'}
${servicesText}
${lead.enrichedRating ? `Rating: ${lead.enrichedRating}/5 (${lead.enrichedReviews} reviews)` : ''}

Generate a personalized first line (1 sentence, 10-15 words max) that:
1. References something specific about their business
2. Shows we understand their industry
3. Hints at a pain point or opportunity
4. Makes them want to read more

IMPORTANT: Be specific, not generic. Reference actual details about their business if possible.

Respond in JSON format:
{
  "firstLine": "...",
  "hook": "...",
  "angle": "..."
}

Where:
- firstLine: The opening line for the email
- hook: The specific pain point or opportunity you're addressing
- angle: Brief explanation of the angle (e.g., "time-savings", "revenue-increase", "customer-retention")`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Haiku for cost efficiency
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text from response
    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON
    let parsed
    try {
      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      parsed = JSON.parse(jsonMatch[0])
    } catch (err) {
      console.error('Failed to parse AI response:', responseText, err)
      return null
    }

    const result: PersonalizationResult = {
      firstLine: parsed.firstLine || '',
      hook: parsed.hook || '',
      angle: parsed.angle || '',
      tokensCost: (response.usage.input_tokens + response.usage.output_tokens) * 0.0000008, // Haiku pricing
    }

    // Store in database
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        personalization: JSON.stringify({
          firstLine: result.firstLine,
          hook: result.hook,
          angle: result.angle,
        }),
      },
    })

    // Log activity
    await logActivity(
      'PERSONALIZATION',
      `Personalized ${lead.companyName}: "${result.firstLine}"`,
      {
        leadId,
        tokenCost: result.tokensCost,
        metadata: {
          hook: result.hook,
          angle: result.angle,
        },
      }
    )

    return result
  } catch (error) {
    console.error('Personalization error:', error)
    return null
  }
}

/**
 * Batch personalize multiple leads
 */
export async function personalizeLeadsBatch(leadIds: string[]) {
  const results = await Promise.allSettled(
    leadIds.map((id) => generatePersonalization(id))
  )

  const successful = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'fulfilled' && item.result.value)
    .map((item) => ({
      leadId: item.leadId,
      ...(item.result as PromiseFulfilledResult<any>).value,
    }))

  const failed = results
    .map((r, i) => ({
      leadId: leadIds[i],
      result: r,
    }))
    .filter((item) => item.result.status === 'rejected')

  // Calculate total token cost
  const totalTokenCost = successful.reduce(
    (sum, item) => sum + (item.tokensCost || 0),
    0
  )

  return {
    successful,
    failed: failed.length,
    total: leadIds.length,
    totalTokenCost,
  }
}
