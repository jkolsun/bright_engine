/**
 * AI Vision — Classifies inbound MMS images using Claude Haiku
 * Determines image type (logo, team_photo, project_photo, etc.)
 * and stores them on the lead record for use in preview sites.
 */

import { prisma } from './db'

export interface ImageClassification {
  type: 'logo' | 'team_photo' | 'project_photo' | 'document' | 'screenshot' | 'unknown'
  confidence: number
  description: string
  suggestedResponse: string
}

/**
 * Classify an image URL using Claude Haiku's vision capabilities.
 * Returns the classification result and a suggested AI response.
 */
export async function classifyImage(imageUrl: string): Promise<ImageClassification> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { type: 'unknown', confidence: 0, description: 'Image received', suggestedResponse: 'Got it, thanks!' }
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: `Classify this image for a web design business. Respond in JSON only:
{"type": "logo|team_photo|project_photo|document|screenshot|unknown", "confidence": 0.0-1.0, "description": "brief description", "suggestedResponse": "natural SMS reply acknowledging the image"}
Examples: "Got your logo! That'll look great on the site." / "Nice team photo — we'll feature that prominently." / "Thanks for the project pics!"`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      console.error('[AI Vision] API error:', res.status)
      return fallbackClassification()
    }

    const data = await res.json()
    const text = data.content?.[0]?.text || ''
    const cleaned = text.replace(/```json\s?/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return {
      type: parsed.type || 'unknown',
      confidence: parsed.confidence || 0.5,
      description: parsed.description || 'Image received',
      suggestedResponse: parsed.suggestedResponse || 'Got it, thanks!',
    }
  } catch (err) {
    console.error('[AI Vision] Classification failed:', err)
    return fallbackClassification()
  }
}

function fallbackClassification(): ImageClassification {
  return {
    type: 'unknown',
    confidence: 0,
    description: 'Image received (classification unavailable)',
    suggestedResponse: 'Got your image, thanks! We\'ll take a look.',
  }
}

/**
 * Process inbound MMS images:
 * 1. Classify each image with AI
 * 2. Store image URLs and types on the lead record
 * 3. Update the message with the media type
 * 4. Return classifications for the AI to respond intelligently
 */
export async function processInboundImages(
  leadId: string,
  messageId: string | undefined,
  mediaUrls: string[]
): Promise<ImageClassification[]> {
  if (!mediaUrls || mediaUrls.length === 0) return []

  const classifications: ImageClassification[] = []

  for (const url of mediaUrls) {
    const classification = await classifyImage(url)
    classifications.push(classification)

    // Store on lead based on type
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { logo: true, photos: true },
    })

    if (lead) {
      if (classification.type === 'logo') {
        await prisma.lead.update({
          where: { id: leadId },
          data: { logo: url },
        })
      } else if (['team_photo', 'project_photo'].includes(classification.type)) {
        const existingPhotos = (lead.photos as string[] || [])
        await prisma.lead.update({
          where: { id: leadId },
          data: { photos: [...existingPhotos, url] },
        })
      }
    }
  }

  // Update message with media type (use the first image's type)
  if (messageId && classifications.length > 0) {
    try {
      await prisma.message.update({
        where: { id: messageId },
        data: { mediaType: classifications[0].type },
      })
    } catch { /* message may not exist yet */ }
  }

  return classifications
}
