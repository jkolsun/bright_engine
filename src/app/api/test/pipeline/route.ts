import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/serpapi'
import { generatePreview } from '@/lib/preview-generator'
import { generatePersonalization } from '@/lib/personalization'

/**
 * POST /api/test/pipeline
 * Test the full personalization pipeline in sequence
 * Body: { leadId, companyName, city, state }
 * 
 * Flow:
 * 1. Enrich lead with SerpAPI data
 * 2. Generate preview website
 * 3. Generate AI-personalized first line
 * 
 * Returns: { success, steps: { enrich, preview, personalize } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { leadId, companyName, city, state } = body

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId required' },
        { status: 400 }
      )
    }

    const results: any = {
      leadId,
      steps: {},
    }

    // Step 1: Enrich
    console.log(`[Pipeline] Step 1: Enriching lead ${leadId}...`)
    try {
      const enrichResult = await enrichLead(leadId)
      results.steps.enrich = {
        status: 'success',
        data: enrichResult,
      }
      console.log(`[Pipeline] ✅ Enrichment complete`)
    } catch (error) {
      console.error(`[Pipeline] ❌ Enrichment failed:`, error)
      results.steps.enrich = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Step 2: Generate Preview
    console.log(`[Pipeline] Step 2: Generating preview for ${leadId}...`)
    try {
      const previewResult = await generatePreview({ leadId })
      results.steps.preview = {
        status: 'success',
        data: previewResult,
      }
      console.log(`[Pipeline] ✅ Preview generation complete`)
    } catch (error) {
      console.error(`[Pipeline] ❌ Preview generation failed:`, error)
      results.steps.preview = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Step 3: Personalize
    console.log(`[Pipeline] Step 3: Generating personalization for ${leadId}...`)
    try {
      const personalizeResult = await generatePersonalization(leadId)
      results.steps.personalize = {
        status: 'success',
        data: personalizeResult,
      }
      console.log(`[Pipeline] ✅ Personalization complete`)
    } catch (error) {
      console.error(`[Pipeline] ❌ Personalization failed:`, error)
      results.steps.personalize = {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }

    // Determine overall success
    const allSuccess = Object.values(results.steps).every((s: any) => s.status === 'success')

    return NextResponse.json({
      success: allSuccess,
      ...results,
    })
  } catch (error) {
    console.error('Pipeline test error:', error)
    return NextResponse.json(
      { error: 'Pipeline test failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
