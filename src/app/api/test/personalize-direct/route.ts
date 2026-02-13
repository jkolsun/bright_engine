import { NextRequest, NextResponse } from 'next/server'
import { generatePersonalization } from '@/lib/personalization'
import { prisma } from '@/lib/db'

/**
 * TEST ENDPOINT: Direct personalization without Redis queue
 * POST /api/test/personalize-direct?leadId=...
 */
export async function POST(request: NextRequest) {
  const leadId = request.nextUrl.searchParams.get('leadId')
  
  if (!leadId) {
    return NextResponse.json(
      { error: 'leadId required' },
      { status: 400 }
    )
  }

  try {
    // Generate personalization directly (bypass queue)
    const personalization = await generatePersonalization(leadId)

    if (!personalization) {
      return NextResponse.json(
        { error: 'Personalization generation failed' },
        { status: 500 }
      )
    }

    // Update lead with personalization data
    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        personalization: personalization,
        previewGeneratedAt: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      personalization,
      updated
    })
  } catch (error) {
    console.error('Direct personalization error:', error)
    return NextResponse.json(
      { error: 'Personalization failed', details: String(error) },
      { status: 500 }
    )
  }
}
