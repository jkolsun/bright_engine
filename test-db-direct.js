const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.ilfnvvlpmkbredebljhd:BrightEngine2026!@aws-1-us-east-1.pooler.supabase.com:5432/postgres'
    }
  }
})

async function test() {
  try {
    console.log('🔗 Connecting to database...')
    
    // Test connection
    const result = await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connected\n')
    
    // Check users
    console.log('👥 Checking users...')
    const users = await prisma.user.findMany()
    console.log(`Found ${users.length} users:`)
    users.forEach(u => {
      console.log(`  • ${u.name} (${u.email}) - ${u.role}`)
    })
    
    // Check leads
    console.log('\n📋 Checking leads...')
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        industry: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })
    console.log(`Found ${leads.length} recent leads:`)
    leads.forEach(l => {
      const date = new Date(l.createdAt).toLocaleString()
      console.log(`  • ${l.firstName} ${l.lastName} - ${l.companyName} (${l.status}) [${date}]`)
    })
    
    // Check if any leads were imported from CSV
    const csvLeads = await prisma.lead.findMany({
      where: { source: 'COLD_EMAIL' },
      select: { id: true, firstName: true, companyName: true, sourceDetail: true }
    })
    console.log(`\n🔍 CSV Import Status:`)
    console.log(`  Total COLD_EMAIL source leads: ${csvLeads.length}`)
    if (csvLeads.length > 0) {
      csvLeads.forEach(l => {
        console.log(`    • ${l.firstName} - ${l.companyName} (${l.sourceDetail})`)
      })
    }
    
    // Check activity log
    console.log('\n📊 Recent Activity:')
    const activity = await prisma.clawdbotActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        action: true,
        description: true,
        createdAt: true,
        metadata: true
      }
    })
    activity.forEach(a => {
      const date = new Date(a.createdAt).toLocaleString()
      console.log(`  • ${a.action}: ${a.description} [${date}]`)
    })
    
    console.log('\n✅ All tests complete')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

test()
