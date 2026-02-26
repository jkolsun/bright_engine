import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

interface TestResult {
  name: string
  category: string
  status: 'pass' | 'fail' | 'warn' | 'skip'
  detail: string
  ms: number
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const results: TestResult[] = []
    const startTime = Date.now()

    // --- 1. DATABASE ---
    try {
      const t = Date.now()
      const count = await prisma.lead.count()
      results.push({ name: 'Database Connection', category: 'Infrastructure', status: 'pass', detail: `Connected. ${count} leads in DB.`, ms: Date.now() - t })
    } catch (err) {
      results.push({ name: 'Database Connection', category: 'Infrastructure', status: 'fail', detail: `${err}`, ms: 0 })
    }

    // --- 2. REDIS ---
    try {
      const t = Date.now()
      if (!process.env.REDIS_URL) throw new Error('REDIS_URL not set')
      const Redis = (await import('ioredis')).default
      const redis = new Redis(process.env.REDIS_URL, { connectTimeout: 5000, retryStrategy: () => null, maxRetriesPerRequest: null })
      const pong = await Promise.race([redis.ping(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))])
      await redis.quit()
      results.push({ name: 'Redis Connection', category: 'Infrastructure', status: pong === 'PONG' ? 'pass' : 'fail', detail: pong === 'PONG' ? 'Connected, PONG received' : `Unexpected: ${pong}`, ms: Date.now() - t })
    } catch (err: any) {
      results.push({ name: 'Redis Connection', category: 'Infrastructure', status: 'fail', detail: err.message || String(err), ms: 0 })
    }

    // --- 3. ENVIRONMENT VARIABLES ---
    const requiredEnvVars = [
      'DATABASE_URL', 'REDIS_URL', 'SESSION_SECRET', 'BASE_URL',
      'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'ANTHROPIC_API_KEY',
    ]
    const optionalEnvVars = [
      'SERPAPI_KEY', 'SERPER_API_KEY', 'INSTANTLY_API_KEY',
      'RESEND_API_KEY', 'CLAWDBOT_API_KEY',
    ]
    for (const key of requiredEnvVars) {
      results.push({
        name: `ENV: ${key}`,
        category: 'Environment',
        status: process.env[key] ? 'pass' : 'fail',
        detail: process.env[key] ? 'Set' : 'MISSING — required for production',
        ms: 0
      })
    }
    for (const key of optionalEnvVars) {
      results.push({
        name: `ENV: ${key}`,
        category: 'Environment',
        status: process.env[key] ? 'pass' : 'warn',
        detail: process.env[key] ? 'Set' : 'Not set — optional but recommended',
        ms: 0
      })
    }

    // --- 4. TWILIO ---
    try {
      const t = Date.now()
      const twilio = (await import('twilio')).default
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch()
      results.push({ name: 'Twilio API', category: 'Services', status: account.status === 'active' ? 'pass' : 'warn', detail: `Account: ${account.friendlyName}, Status: ${account.status}`, ms: Date.now() - t })

      // Check phone number webhook
      const numbers = await client.incomingPhoneNumbers.list({ limit: 5 })
      const ourNumber = numbers.find(n => n.phoneNumber === process.env.TWILIO_PHONE_NUMBER)
      if (ourNumber) {
        const smsUrl = ourNumber.smsUrl || ''
        const expectedUrl = `${process.env.BASE_URL}/api/webhooks/twilio`
        if (smsUrl.includes('/api/webhooks/twilio')) {
          results.push({ name: 'Twilio Webhook URL', category: 'Services', status: 'pass', detail: `SMS webhook: ${smsUrl}`, ms: 0 })
        } else {
          results.push({ name: 'Twilio Webhook URL', category: 'Services', status: 'fail', detail: `SMS webhook is "${smsUrl}" — should be "${expectedUrl}". Inbound SMS will be lost!`, ms: 0 })
        }
      } else {
        results.push({ name: 'Twilio Phone Number', category: 'Services', status: 'fail', detail: `Phone ${process.env.TWILIO_PHONE_NUMBER} not found in account`, ms: 0 })
      }
    } catch (err: any) {
      results.push({ name: 'Twilio API', category: 'Services', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 5. STRIPE ---
    try {
      const t = Date.now()
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any })
      const balance = await stripe.balance.retrieve()
      results.push({ name: 'Stripe API', category: 'Services', status: 'pass', detail: `Connected. Available: $${(balance.available[0]?.amount || 0) / 100}`, ms: Date.now() - t })
    } catch (err: any) {
      results.push({ name: 'Stripe API', category: 'Services', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 6. ANTHROPIC (Claude) ---
    try {
      const t = Date.now()
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('Key not set')
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK"' }],
        }),
      })
      if (res.ok) {
        results.push({ name: 'Anthropic API', category: 'Services', status: 'pass', detail: 'Claude responds. AI auto-responses will work.', ms: Date.now() - t })
      } else {
        const err = await res.text()
        results.push({ name: 'Anthropic API', category: 'Services', status: 'fail', detail: `HTTP ${res.status}: ${err.slice(0, 100)}`, ms: Date.now() - t })
      }
    } catch (err: any) {
      results.push({ name: 'Anthropic API', category: 'Services', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 7. RESEND (Email) ---
    try {
      const t = Date.now()
      if (!process.env.RESEND_API_KEY) {
        results.push({ name: 'Resend Email', category: 'Services', status: 'warn', detail: 'RESEND_API_KEY not set — email channel disabled', ms: 0 })
      } else {
        const res = await fetch('https://api.resend.com/domains', {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        if (res.ok) {
          const data = await res.json()
          results.push({ name: 'Resend Email', category: 'Services', status: 'pass', detail: `Connected. ${data.data?.length || 0} domain(s) configured.`, ms: Date.now() - t })
        } else {
          results.push({ name: 'Resend Email', category: 'Services', status: 'fail', detail: `HTTP ${res.status}`, ms: Date.now() - t })
        }
      }
    } catch (err: any) {
      results.push({ name: 'Resend Email', category: 'Services', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 8. DATABASE HEALTH ---
    try {
      const t = Date.now()
      const [leadCount, clientCount, messageCount, notifCount, eventCount] = await Promise.all([
        prisma.lead.count(),
        prisma.client.count(),
        prisma.message.count(),
        prisma.notification.count(),
        prisma.leadEvent.count(),
      ])
      results.push({ name: 'Database Tables', category: 'Data', status: 'pass', detail: `Leads: ${leadCount}, Clients: ${clientCount}, Messages: ${messageCount}, Events: ${eventCount}, Notifications: ${notifCount}`, ms: Date.now() - t })

      const orphanedMsgs = await prisma.message.count({ where: { AND: [{ leadId: null }, { clientId: null }] } })
      results.push({
        name: 'Orphaned Messages',
        category: 'Data',
        status: orphanedMsgs > 0 ? 'warn' : 'pass',
        detail: orphanedMsgs > 0 ? `${orphanedMsgs} messages with no lead/client link — likely inbound SMS with phone format mismatch` : 'None — all messages linked to leads/clients',
        ms: 0,
      })
    } catch (err: any) {
      results.push({ name: 'Database Tables', category: 'Data', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 9. PREVIEW ENGINE ---
    try {
      const t = Date.now()
      const leadsWithPreviews = await prisma.lead.count({ where: { previewId: { not: null } } })
      const totalLeads = await prisma.lead.count()
      results.push({
        name: 'Preview Generation',
        category: 'Features',
        status: leadsWithPreviews > 0 ? 'pass' : 'warn',
        detail: `${leadsWithPreviews}/${totalLeads} leads have preview URLs`,
        ms: Date.now() - t,
      })
    } catch (err: any) {
      results.push({ name: 'Preview Generation', category: 'Features', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 10. HOT LEAD PIPELINE (score-based) ---
    try {
      const t = Date.now()
      const hotPriority = await prisma.lead.count({ where: { priority: 'HOT' } })
      const hotEngagement = await prisma.lead.count({ where: { engagementLevel: 'HOT' } })
      const hotStatus = await prisma.lead.count({ where: { status: 'HOT_LEAD' } })
      const scoredLeads = await prisma.lead.count({ where: { engagementScore: { not: null } } })
      const totalLeads = await prisma.lead.count()
      results.push({
        name: 'Hot Lead Pipeline',
        category: 'Features',
        status: hotPriority === hotEngagement ? 'pass' : 'warn',
        detail: `priority=HOT: ${hotPriority}, engagementLevel=HOT: ${hotEngagement}, status=HOT_LEAD: ${hotStatus} (info). Scored: ${scoredLeads}/${totalLeads}`,
        ms: Date.now() - t,
      })
    } catch (err: any) {
      results.push({ name: 'Hot Lead Pipeline', category: 'Features', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 11. SMS DELIVERY CHECK ---
    try {
      const t = Date.now()
      const recentSms = await prisma.message.findMany({
        where: { channel: 'SMS', direction: 'OUTBOUND', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })
      const delivered = recentSms.filter(m => m.twilioStatus === 'delivered').length
      const failed = recentSms.filter(m => m.twilioStatus === 'failed' || m.twilioStatus === 'undelivered').length
      const pending = recentSms.filter(m => !m.twilioStatus || m.twilioStatus === 'sent' || m.twilioStatus === 'queued').length
      results.push({
        name: 'SMS Delivery (24h)',
        category: 'Features',
        status: failed > delivered ? 'fail' : failed > 0 ? 'warn' : recentSms.length === 0 ? 'skip' : 'pass',
        detail: recentSms.length === 0 ? 'No SMS sent in last 24h' : `${recentSms.length} sent: ${delivered} delivered, ${failed} failed, ${pending} pending`,
        ms: Date.now() - t,
      })
    } catch (err: any) {
      results.push({ name: 'SMS Delivery (24h)', category: 'Features', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 12. AI AUTO-RESPONSE CHECK ---
    try {
      const t = Date.now()
      const aiMessages = await prisma.message.findMany({
        where: { senderType: 'CLAWDBOT', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })
      results.push({
        name: 'AI Auto-Responses (24h)',
        category: 'Features',
        status: aiMessages.length > 0 ? 'pass' : 'skip',
        detail: aiMessages.length > 0 ? `${aiMessages.length} AI messages sent in last 24h` : 'No AI messages in last 24h (may be normal if no CTA clicks)',
        ms: Date.now() - t,
      })
    } catch (err: any) {
      results.push({ name: 'AI Auto-Responses (24h)', category: 'Features', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 13. PRODUCTS & PRICING ---
    try {
      const t = Date.now()
      const settings = await prisma.settings.findFirst({ where: { key: 'products' } })
      if (settings?.value) {
        const products = JSON.parse(settings.value as string)
        const core = Array.isArray(products) ? products.find((p: any) => p.isCore) : null
        if (core) {
          const price = core.month1Price || core.setupFee || core.price
          results.push({
            name: 'Core Product Pricing',
            category: 'Configuration',
            status: price == 188 ? 'pass' : 'fail',
            detail: price == 188 ? 'Core product: $188 first month' : `Core product shows $${price} — should be $188`,
            ms: Date.now() - t,
          })
        } else {
          results.push({ name: 'Core Product Pricing', category: 'Configuration', status: 'warn', detail: 'No core product found in settings', ms: Date.now() - t })
        }
      } else {
        results.push({ name: 'Core Product Pricing', category: 'Configuration', status: 'warn', detail: 'Products not configured in settings table', ms: Date.now() - t })
      }
    } catch (err: any) {
      results.push({ name: 'Core Product Pricing', category: 'Configuration', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- 14. INBOUND MESSAGE CHECK ---
    try {
      const t = Date.now()
      const inbound = await prisma.message.count({ where: { direction: 'INBOUND' } })
      const inboundNoLead = await prisma.message.count({ where: { direction: 'INBOUND', leadId: null } })
      results.push({
        name: 'Inbound Message Matching',
        category: 'Features',
        status: inboundNoLead > 0 ? 'warn' : inbound === 0 ? 'skip' : 'pass',
        detail: inbound === 0
          ? 'No inbound messages received yet'
          : `${inbound} inbound total, ${inboundNoLead} unmatched to leads${inboundNoLead > 0 ? ' — check phone format normalization' : ''}`,
        ms: Date.now() - t,
      })
    } catch (err: any) {
      results.push({ name: 'Inbound Message Matching', category: 'Features', status: 'fail', detail: err.message, ms: 0 })
    }

    // --- SUMMARY ---
    const passed = results.filter(r => r.status === 'pass').length
    const failed = results.filter(r => r.status === 'fail').length
    const warned = results.filter(r => r.status === 'warn').length
    const skipped = results.filter(r => r.status === 'skip').length

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary: { passed, failed, warned, skipped, total: results.length },
      verdict: failed === 0 ? 'ALL_CLEAR' : failed <= 3 ? 'ISSUES_FOUND' : 'CRITICAL_FAILURES',
      results,
    })
  } catch (error) {
    console.error('System test failed:', error)
    return NextResponse.json({ error: 'System test crashed', details: String(error) }, { status: 500 })
  }
}
