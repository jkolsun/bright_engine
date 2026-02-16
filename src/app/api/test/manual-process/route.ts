import { NextRequest, NextResponse } from 'next/server'
import { enrichLead } from '@/lib/serpapi'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/test/manual-process - Manually process leads bypassing BullMQ entirely
 */
export async function GET(request: NextRequest) {
  try {
    const testToken = request.nextUrl.searchParams.get('test-token')
    if (testToken !== 'e2e-test-live-pipeline-2026') {
      return NextResponse.json({ error: 'Invalid test token' }, { status: 403 })
    }

    console.log('[MANUAL-PROCESS] Finding recent test leads...')
    
    // Get recent leads created in last 30 minutes that don't have enrichment
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
    
    const leads = await prisma.lead.findMany({
      where: {
        createdAt: { gte: thirtyMinutesAgo },
        // No enrichment data yet
        website: null,
        googleRating: null,
        lastEnriched: null
      },
      take: 5 // Process max 5 leads
    })
    
    console.log(`[MANUAL-PROCESS] Found ${leads.length} leads to process`)
    
    const results = []
    
    for (const lead of leads) {
      console.log(`[MANUAL-PROCESS] Processing lead ${lead.id} - ${lead.firstName} ${lead.lastName} at ${lead.companyName}`)
      
      try {
        // Call enrichment directly
        await enrichLead(lead.id)
        
        // Check if enrichment worked
        const enrichedLead = await prisma.lead.findUnique({
          where: { id: lead.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            website: true,
            googleRating: true,
            businessAddress: true,
            lastEnriched: true,
            enrichmentStatus: true
          }
        })
        
        results.push({
          leadId: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          company: lead.companyName,
          processed: true,
          enriched: {
            website: enrichedLead?.website,
            googleRating: enrichedLead?.googleRating,
            businessAddress: enrichedLead?.businessAddress,
            lastEnriched: enrichedLead?.lastEnriched,
            status: enrichedLead?.enrichmentStatus
          }
        })
        
        console.log(`[MANUAL-PROCESS] ✅ Successfully processed lead ${lead.id}`)
        
      } catch (error) {
        console.error(`[MANUAL-PROCESS] ❌ Failed to process lead ${lead.id}:`, error)
        results.push({
          leadId: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          company: lead.companyName,
          processed: false,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
      message: `Manually processed ${results.filter(r => r.processed).length} of ${results.length} leads`
    })
    
  } catch (error) {
    console.error('[MANUAL-PROCESS] Error:', error)
    return NextResponse.json(
      {
        error: 'Manual processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}