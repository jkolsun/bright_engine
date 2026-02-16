const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPipelineState() {
  try {
    console.log('🔍 Checking pipeline state for test leads...\n')

    // Get the 5 test leads (created in last few minutes)
    const leads = await prisma.lead.findMany({
      where: {
        firstName: {
          in: ['John', 'Maria', 'Bob', 'Sarah', 'Mike']
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    console.log(`Found ${leads.length} test leads\n`)

    // Check each lead's pipeline status
    leads.forEach(lead => {
      console.log(`📋 ${lead.firstName} ${lead.lastName}`)
      console.log(`   ID: ${lead.id}`)
      console.log(`   Status: ${lead.status}`)
      console.log(`   Source: ${lead.source}`)
      console.log(`   Industry: ${lead.industry} (type: ${typeof lead.industry})`)
      console.log(`   Website: ${lead.website || '(none)'}`)
      console.log(`   Preview URL: ${lead.previewUrl || '(not set)'}`)
      console.log(`   Preview ID: ${lead.previewId || '(not set)'}`)
      console.log(`   Instantly Status: ${lead.instantlyStatus || '(not set)'}`)
      console.log(`   Instantly Campaign ID: ${lead.instantlyCampaignId || '(not set)'}`)
      console.log(`   Created: ${lead.createdAt}`)
      console.log('')
    })

    // Check for enrichment jobs
    console.log('📊 Checking enrichment status...\n')
    
    const enrichmentJobs = await prisma.$queryRaw`
      SELECT * FROM "ClawdbotActivity" 
      WHERE description LIKE '%pipeline_test%' OR description LIKE '%E2E Test%'
      ORDER BY "createdAt" DESC
      LIMIT 20
    `.catch(err => {
      console.log('(Could not query activity log - table might not exist or different name)')
      return []
    })

    if (enrichmentJobs.length > 0) {
      console.log(`Found ${enrichmentJobs.length} recent activities:\n`)
      enrichmentJobs.slice(0, 5).forEach(activity => {
        console.log(`• ${activity.action}: ${activity.description}`)
      })
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('PIPELINE STATE SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // Analyze pipeline progress
    const withPreview = leads.filter(l => l.previewUrl).length
    const withInstantlyStatus = leads.filter(l => l.instantlyStatus).length
    const withCampaignId = leads.filter(l => l.instantlyCampaignId).length

    console.log(`3b - Enrichment Queued: ${leads.length}/5 leads in DB (100%)`)
    console.log(`3d - Preview Generated: ${withPreview}/5 leads have previewUrl (${Math.round(withPreview/5*100)}%)`)
    console.log(`3f - Distribution: ${withInstantlyStatus}/5 leads have instantlyStatus (${Math.round(withInstantlyStatus/5*100)}%)`)
    console.log(`    - With Campaign ID: ${withCampaignId}/5 (${Math.round(withCampaignId/5*100)}%)`)

    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

checkPipelineState()
