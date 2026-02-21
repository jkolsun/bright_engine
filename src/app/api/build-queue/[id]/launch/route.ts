import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { addDomain, checkDomain } from '@/lib/vercel'

export const dynamic = 'force-dynamic'

/**
 * POST /api/build-queue/[id]/launch
 * Launch the client's site on their custom domain via Vercel.
 * Body: { domain: "www.johnsonroofing.com" }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id: leadId } = await context.params
    const { domain } = await request.json()

    if (!domain?.trim()) {
      return NextResponse.json({ error: 'Domain required' }, { status: 400 })
    }

    const cleanDomain = domain.trim().toLowerCase()

    // Find the lead and its client
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        companyName: true,
        buildStep: true,
        client: {
          select: { id: true, customDomain: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.client) {
      return NextResponse.json({ error: 'Lead has not been converted to a client yet' }, { status: 400 })
    }

    // Check if domain is already in use
    const existing = await prisma.client.findFirst({
      where: { customDomain: cleanDomain, id: { not: lead.client.id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Domain already assigned to another client' }, { status: 409 })
    }

    // Add domain to Vercel
    let vercelResult: { name: string } | null = null
    try {
      vercelResult = await addDomain(cleanDomain)
    } catch (err) {
      console.error('[Launch] Vercel addDomain failed:', err)
      // If Vercel env vars aren't set, allow the launch to proceed with just DB updates
      if (!process.env.VERCEL_TOKEN) {
        console.warn('[Launch] VERCEL_TOKEN not set — skipping Vercel API call, updating DB only')
      } else {
        return NextResponse.json({ error: `Failed to add domain to Vercel: ${err}` }, { status: 500 })
      }
    }

    // Update client with domain info
    await prisma.client.update({
      where: { id: lead.client.id },
      data: {
        customDomain: cleanDomain,
        vercelDomainId: vercelResult?.name || cleanDomain,
        siteUrl: `https://${cleanDomain}`,
        domainStatus: 'registered_by_us',
        hostingStatus: 'ACTIVE',
        siteLiveDate: new Date(),
      },
    })

    // Update lead build status
    await prisma.lead.update({
      where: { id: leadId },
      data: {
        buildStep: 'LAUNCHING',
        buildCompletedAt: new Date(),
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        type: 'CLOSE_ENGINE',
        title: 'Site Launched',
        message: `${lead.companyName} is now live at ${cleanDomain}. Client needs to add CNAME: www → cname.vercel-dns.com`,
        metadata: { leadId, clientId: lead.client.id, domain: cleanDomain },
      },
    })

    // Check DNS status
    let dnsStatus = { configured: false, verified: false }
    try {
      dnsStatus = await checkDomain(cleanDomain)
    } catch { /* DNS check is informational */ }

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      dnsConfigured: dnsStatus.configured,
      dnsVerified: dnsStatus.verified,
      instructions: `Client needs to add a CNAME record: www → cname.vercel-dns.com`,
    })
  } catch (error) {
    console.error('Error launching site:', error)
    return NextResponse.json({ error: 'Failed to launch site' }, { status: 500 })
  }
}
