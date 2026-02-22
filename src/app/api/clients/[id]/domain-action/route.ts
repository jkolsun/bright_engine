import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { addDomainWithWww, checkDomain, getDnsInstructions } from '@/lib/vercel'
import { updateOnboarding, advanceOnboarding } from '@/lib/onboarding'
import { sendSMSViaProvider } from '@/lib/sms-provider'
import { addSequenceJob } from '@/worker/queue'
import { getSystemMessage } from '@/lib/system-messages'

export const dynamic = 'force-dynamic'

/**
 * POST /api/clients/[id]/domain-action
 * Body: { action: 'add_to_vercel' | 'mark_registered' | 'check_dns' | 'resend_dns_instructions' | 'force_go_live' }
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

    const { id: clientId } = await context.params
    const body = await request.json()
    const { action } = body

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { lead: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const onboardingData = (client.onboardingData as Record<string, unknown>) || {}
    const domain = (body.domain || onboardingData.domainPreference || client.customDomain) as string

    switch (action) {
      case 'add_to_vercel': {
        if (!domain) {
          return NextResponse.json({ error: 'No domain specified' }, { status: 400 })
        }

        // Add domain (apex + www) to Vercel
        const result = await addDomainWithWww(domain)

        // Update client record
        await prisma.client.update({
          where: { id: clientId },
          data: {
            customDomain: domain,
            domainStatus: 'PENDING_DNS',
            vercelDomainId: result.name || domain,
          },
        })

        // Send DNS instructions to client
        const dnsInstructions = getDnsInstructions(domain)
        if (client.lead?.phone) {
          const { text: dnsMessage, enabled: dnsEnabled } = await getSystemMessage('onboarding_dns_instructions', {
            firstName: client.lead.firstName || 'there',
            domain,
            dnsInstructions,
          })
          if (dnsEnabled) {
            await sendSMSViaProvider({
              to: client.lead.phone,
              message: dnsMessage,
              clientId,
              trigger: 'onboarding_dns_instructions',
              aiGenerated: false,
              conversationType: 'post_client',
              sender: 'system',
            })
          }
        }

        // Record when DNS instructions were sent (for nudge timing in worker)
        await updateOnboarding(clientId, { dnsInstructionsSentAt: new Date().toISOString() })

        // Advance to DNS verification step and queue DNS check
        await advanceOnboarding(clientId, 5)
        await addSequenceJob('onboarding-dns-check', { clientId }, 15 * 60 * 1000) // First check in 15 min

        return NextResponse.json({
          success: true,
          message: `Domain ${domain} added to Vercel. DNS instructions sent. Verification polling started.`,
          result,
        })
      }

      case 'mark_registered': {
        if (!domain) {
          return NextResponse.json({ error: 'No domain specified' }, { status: 400 })
        }

        await prisma.client.update({
          where: { id: clientId },
          data: {
            customDomain: domain,
            domainStatus: 'REGISTERED',
          },
        })
        await updateOnboarding(clientId, { domainOwnership: 'registered_by_us', domainRegisteredAt: new Date().toISOString() })

        // Notify client
        if (client.lead?.phone) {
          await sendSMSViaProvider({
            to: client.lead.phone,
            message: `Great news! We've registered ${domain} for your website. We're setting it up now — you'll be notified once it's ready!`,
            clientId,
            trigger: 'onboarding_domain_registered',
            aiGenerated: false,
            conversationType: 'post_client',
            sender: 'system',
          })
        }

        return NextResponse.json({ success: true, message: `Domain ${domain} marked as registered.` })
      }

      case 'check_dns': {
        if (!domain) {
          return NextResponse.json({ error: 'No domain to check' }, { status: 400 })
        }

        const dnsResult = await checkDomain(domain)
        const isVerified = dnsResult?.configured === true && dnsResult?.verified === true

        if (isVerified) {
          await prisma.client.update({
            where: { id: clientId },
            data: { domainStatus: 'VERIFIED' },
          })
          await advanceOnboarding(clientId, 6)

          await prisma.notification.create({
            data: {
              type: 'CLIENT_TEXT',
              title: 'DNS Verified',
              message: `${client.companyName}'s domain ${domain} is now verified and pointing correctly.`,
              metadata: { clientId, domain },
            },
          })
        }

        return NextResponse.json({
          success: true,
          verified: isVerified,
          dnsResult,
          message: isVerified ? 'DNS verified! Client advanced to go-live confirmation.' : 'DNS not yet verified.',
        })
      }

      case 'resend_dns_instructions': {
        if (!domain) {
          return NextResponse.json({ error: 'No domain to send instructions for' }, { status: 400 })
        }

        const dnsInstructions = getDnsInstructions(domain)
        if (client.lead?.phone) {
          const { text: dnsMessage, enabled: dnsEnabled } = await getSystemMessage('onboarding_dns_instructions', {
            firstName: client.lead.firstName || 'there',
            domain,
            dnsInstructions,
          })
          if (dnsEnabled) {
            await sendSMSViaProvider({
              to: client.lead.phone,
              message: dnsMessage,
              clientId,
              trigger: 'onboarding_dns_resend',
              aiGenerated: false,
              conversationType: 'post_client',
              sender: 'system',
            })
          }
        }

        return NextResponse.json({ success: true, message: 'DNS instructions resent.' })
      }

      case 'force_go_live': {
        // Force the site live, skipping remaining onboarding steps
        const siteUrl = domain ? `https://${domain}` : client.siteUrl

        await prisma.client.update({
          where: { id: clientId },
          data: {
            siteLiveDate: new Date(),
            siteUrl,
            hostingStatus: 'ACTIVE',
            domainStatus: domain ? 'LIVE' : client.domainStatus,
          },
        })

        // Advance to step 7 (complete) — this triggers post-launch sequences
        await advanceOnboarding(clientId, 7)

        // Send go-live notification to client
        if (client.lead?.phone) {
          const { text: goLiveMessage, enabled } = await getSystemMessage('site_live', {
            firstName: client.lead.firstName || 'there',
            companyName: client.companyName,
            siteUrl: siteUrl || domain || 'your website',
          })
          if (enabled) {
            await sendSMSViaProvider({
              to: client.lead.phone,
              message: goLiveMessage,
              clientId,
              trigger: 'onboarding_go_live',
              aiGenerated: false,
              conversationType: 'post_client',
              sender: 'system',
            })
          }
        }

        await prisma.notification.create({
          data: {
            type: 'CLIENT_TEXT',
            title: 'Site Gone Live',
            message: `${client.companyName} is now live at ${siteUrl || domain}. Onboarding complete.`,
            metadata: { clientId, domain, siteUrl },
          },
        })

        return NextResponse.json({ success: true, message: `Site is now live at ${siteUrl || domain}. Onboarding complete.` })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Error executing domain action:', error)
    return NextResponse.json(
      { error: 'Failed to execute domain action', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
