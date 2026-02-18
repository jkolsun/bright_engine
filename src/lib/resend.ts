import { Resend } from 'resend'
import { prisma } from './db'
import { addSequenceJob } from '../worker/queue'

// Lazy initialize Resend client
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY not set')
    resendClient = new Resend(key)
  }
  return resendClient
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL || 'Bright Automations <support@brightautomations.net>'
}

// ── Types ──────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  leadId?: string
  clientId?: string
  sender?: string
  trigger?: string
  tags?: { name: string; value: string }[]
}

export interface SendEmailResult {
  success: boolean
  resendId?: string
  error?: string
}

// ── Send Email ─────────────────────────────────────────

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, leadId, clientId, sender = 'clawdbot', trigger, tags } = options

  // Resolve leadId from client if only clientId provided
  let resolvedLeadId = leadId
  if (!resolvedLeadId && clientId) {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { leadId: true },
    })
    if (!client?.leadId) {
      console.error(`[RESEND] No lead linked to client ${clientId}`)
      return { success: false, error: 'No lead linked to client' }
    }
    resolvedLeadId = client.leadId
  }

  // Duplicate send guard: check for same trigger + clientId in last hour
  if (trigger && clientId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const existing = await prisma.message.findFirst({
      where: {
        clientId,
        trigger,
        channel: 'EMAIL',
        createdAt: { gte: oneHourAgo },
      },
    })
    if (existing) {
      console.log(`[RESEND] Duplicate guard: ${trigger} already sent to client ${clientId} within last hour`)
      return { success: false, error: 'Duplicate send blocked' }
    }
  }

  try {
    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: getFromEmail(),
      to: [to],
      subject,
      html,
      text,
      tags,
    })

    if (error) {
      console.error('[RESEND] Send failed:', error)
      await prisma.message.create({
        data: {
          leadId: resolvedLeadId,
          clientId,
          direction: 'OUTBOUND',
          channel: 'EMAIL',
          senderType: 'CLAWDBOT',
          senderName: sender,
          recipient: to,
          content: html,
          emailSubject: subject,
          trigger,
          resendStatus: 'failed',
        },
      })
      return { success: false, error: error.message }
    }

    const resendId = data?.id

    // Log to Message
    await prisma.message.create({
      data: {
        leadId: resolvedLeadId,
        clientId,
        direction: 'OUTBOUND',
        channel: 'EMAIL',
        senderType: 'CLAWDBOT',
        senderName: sender,
        recipient: to,
        content: html,
        emailSubject: subject,
        trigger,
        resendId,
        resendStatus: 'sent',
      },
    })

    // Log to OutboundEvent (requires leadId)
    if (resolvedLeadId) {
      await prisma.outboundEvent.create({
        data: {
          leadId: resolvedLeadId,
          channel: 'EMAIL',
          status: 'SENT',
          messageId: resendId,
          subject,
          content: html,
          recipientEmail: to,
          sentAt: new Date(),
        },
      })
    }

    return { success: true, resendId: resendId || undefined }
  } catch (error) {
    console.error('[RESEND] Send error:', error)

    await prisma.message.create({
      data: {
        leadId: resolvedLeadId,
        clientId,
        direction: 'OUTBOUND',
        channel: 'EMAIL',
        senderType: 'CLAWDBOT',
        senderName: sender,
        recipient: to,
        content: html,
        emailSubject: subject,
        trigger,
        resendStatus: 'failed',
      },
    })

    return { success: false, error: (error as Error).message }
  }
}

// ── Template System ────────────────────────────────────

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#1e40af;padding:24px 32px;">
<span style="color:#ffffff;font-size:20px;font-weight:600;">Bright Automations</span>
</td></tr>
<tr><td style="padding:32px;color:#18181b;font-size:15px;line-height:1.6;">
${body}
</td></tr>
<tr><td style="padding:16px 32px;background:#f4f4f5;color:#71717a;font-size:12px;text-align:center;">
Bright Automations &bull; brightautomations.net
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  // ── Onboarding ──────────────────────────────────────
  onboarding_welcome: {
    subject: 'Welcome to Bright Automations, {first_name}!',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>This is Andrew from Bright Automations. We're excited to build your site for <strong>{company_name}</strong>!</p>
      <p>To get started, I need a few things:</p>
      <ol>
        <li>Business name as you want it on the site</li>
        <li>Phone, email, and address</li>
        <li>Business hours</li>
        <li>Services list</li>
        <li>Logo</li>
        <li>Photos of your work or team</li>
        <li>Color/style preferences</li>
      </ol>
      <p>Once I have this, I'll have a draft ready in <strong>24-48 hours</strong>!</p>
      <p>Just reply to this email or text me directly.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  onboarding_nudge: {
    subject: 'Quick follow-up — info for your site',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Just checking in — even just your <strong>services list and phone number</strong> is enough for a first draft.</p>
      <p>We can start with what we already have and you can swap things in later.</p>
      <p>Reply here or text me anytime.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  // ── Post-Launch ─────────────────────────────────────
  post_launch_day_3: {
    subject: 'Quick tip for {company_name}\'s new site',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Quick tip: <strong>Add your site link to your Google Business Profile.</strong> That alone can double your local visibility.</p>
      <p>If you need help with that, just let me know!</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  post_launch_day_7: {
    subject: 'Your first week stats — {company_name}',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Here's your first week:</p>
      <table style="margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 16px 8px 0;font-weight:600;">Visitors</td><td style="padding:8px 0;">{visits}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;font-weight:600;">Form Submissions</td><td style="padding:8px 0;">{forms}</td></tr>
      </table>
      <p>Traffic picks up as Google indexes your pages. We'll keep you posted on the numbers.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  post_launch_day_14: {
    subject: 'Traffic insight for {company_name}',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Insight: Your top traffic source is <strong>{source}</strong>.</p>
      <p>This is a good sign — it means people are finding you. As your site ages and Google crawls it more, expect steady growth.</p>
      <p>Let me know if you have any questions!</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  post_launch_day_21: {
    subject: 'Lead response times — {company_name}',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>I noticed something: you got <strong>{leads} leads</strong> but your average response time is <strong>{time}</strong>.</p>
      <p>Businesses that respond in under 5 minutes are <strong>21x more likely</strong> to close the deal.</p>
      <p>If you want, I can set up instant text-back so leads get a response within 60 seconds — even when you're on a job.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  post_launch_day_28: {
    subject: 'Monthly report — {company_name}',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Here's your monthly report:</p>
      <table style="margin:16px 0;border-collapse:collapse;">
        <tr><td style="padding:8px 16px 8px 0;font-weight:600;">Visitors</td><td style="padding:8px 0;">{visits}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;font-weight:600;">Leads</td><td style="padding:8px 0;">{forms}</td></tr>
        <tr><td style="padding:8px 16px 8px 0;font-weight:600;">Calls</td><td style="padding:8px 0;">{calls}</td></tr>
      </table>
      <p>I have some ideas to get even more out of your site — mind if I share?</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  // ── Win-Back ────────────────────────────────────────
  win_back_day_7: {
    subject: '{company_name}\'s site goes offline soon',
    body: wrapHtml(`
      <p>Hey {first_name},</p>
      <p>Your hosting was cancelled. <strong>{company_name}'s site goes offline in 7 days.</strong></p>
      <p>If you'd like to keep it live, just reply "keep it" and we'll reactivate your account.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  win_back_day_14: {
    subject: 'Special offer — keep {company_name}\'s site live',
    body: wrapHtml(`
      <p>Hey {first_name},</p>
      <p>Come back at <strong>$29/month for 3 months</strong> (save $30).</p>
      <p>Your site for {company_name} is still ready to go. Reply "deal" to reactivate.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  win_back_day_30: {
    subject: 'Final notice — {company_name}\'s site and data',
    body: wrapHtml(`
      <p>Hey {first_name},</p>
      <p><strong>Last notice:</strong> your site and all data will be permanently deleted in 48 hours.</p>
      <p>Reply "save" to keep it.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  // ── Referral ────────────────────────────────────────
  referral_day_45: {
    subject: 'Know someone who needs a website?',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Know a business owner who needs a site? <strong>Refer them and you both get a free month of hosting.</strong></p>
      <p>Just reply with their name and number, or have them mention your name when they reach out.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  referral_day_90: {
    subject: 'Refer a business, get a free month',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>We just launched a site for another {industry} company. Send anyone our way and <strong>you get a free month of hosting</strong>.</p>
      <p>Just reply with their info or have them mention your name.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },

  referral_day_180: {
    subject: 'Your 6-month results with Bright Automations',
    body: wrapHtml(`
      <p>Hey {first_name}!</p>
      <p>Your site has generated <strong>{leads} leads</strong> in 6 months. Know anyone who could use results like that?</p>
      <p>Refer them and you both get a free month of hosting.</p>
      <p style="margin-top:24px;">— Andrew<br>Bright Automations</p>
    `),
  },
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '')
  }
  return result
}

export async function getEmailTemplate(
  key: string,
  mergeVars: Record<string, string>
): Promise<{ subject: string; body: string } | null> {
  // Try loading from Settings table first
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'email_templates' },
    })
    if (setting?.value) {
      const templates = setting.value as Record<string, { subject: string; body: string }>
      if (templates[key]) {
        return {
          subject: fillTemplate(templates[key].subject, mergeVars),
          body: fillTemplate(wrapHtml(templates[key].body), mergeVars),
        }
      }
    }
  } catch (e) {
    console.warn('[RESEND] Failed to load templates from Settings:', e)
  }

  // Fall back to hardcoded defaults
  const defaultTemplate = DEFAULT_TEMPLATES[key]
  if (!defaultTemplate) return null

  return {
    subject: fillTemplate(defaultTemplate.subject, mergeVars),
    body: fillTemplate(defaultTemplate.body, mergeVars),
  }
}

// ── Sequence Triggers ──────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

export async function triggerOnboardingSequence(clientId: string) {
  await addSequenceJob('onboarding-welcome-email', { clientId })
  await addSequenceJob('onboarding-nudge-email', { clientId }, DAY_MS)
}

export async function triggerPostLaunchSequence(clientId: string) {
  await addSequenceJob('post-launch-day-3-email', { clientId }, 3 * DAY_MS)
  await addSequenceJob('post-launch-day-7-email', { clientId }, 7 * DAY_MS)
  await addSequenceJob('post-launch-day-14-email', { clientId }, 14 * DAY_MS)
  await addSequenceJob('post-launch-day-21-email', { clientId }, 21 * DAY_MS)
  await addSequenceJob('post-launch-day-28-email', { clientId }, 28 * DAY_MS)
}

export async function triggerWinBackSequence(clientId: string) {
  await addSequenceJob('win-back-day-7-email', { clientId }, 7 * DAY_MS)
  await addSequenceJob('win-back-day-14-email', { clientId }, 14 * DAY_MS)
  await addSequenceJob('win-back-day-30-email', { clientId }, 30 * DAY_MS)
}

export async function triggerReferralSequence(clientId: string) {
  await addSequenceJob('referral-day-45-email', { clientId }, 45 * DAY_MS)
  await addSequenceJob('referral-day-90-email', { clientId }, 90 * DAY_MS)
  await addSequenceJob('referral-day-180-email', { clientId }, 180 * DAY_MS)
}
