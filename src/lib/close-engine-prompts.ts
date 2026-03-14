/**
 * Close Engine Prompt Builder
 *
 * Pure functions that build system prompts for the AI Close Engine.
 * No DB calls, no side effects — takes context and returns prompt strings.
 */

import type { ConversationContext } from './close-engine'
import { prisma } from './db'

// ============================================
// Models
// ============================================

export const MODELS = {
  PRE_CLIENT: 'claude-sonnet-4-6',
  POST_CLIENT: 'claude-haiku-4-5-20251001',
} as const

// ============================================
// Escalation Keywords
// ============================================

export const ESCALATION_KEYWORDS = [
  'refund', 'cancel', 'cancellation',
  'lawyer', 'attorney', 'legal', 'sue', 'lawsuit',
  'scam', 'fraud', 'rip off', 'ripoff',
  'talk to a person', 'speak to someone', 'human', 'real person', 'manager',
  'bbb', 'better business bureau', 'complaint',
  'worst', 'terrible', 'horrible', 'unacceptable',
  'angry', 'furious', 'disgusted',
  'discount', 'cheaper', 'too expensive', 'lower price',
]

// ============================================
// Stage-Specific Instructions
// ============================================

const DEFAULT_QUALIFYING_FLOW: Record<string, string> = {
  TEXT_1_OPENING: 'Hey {firstName}! Saw you checked out the preview we built for {companyName}. We can get this live for you in no time. Quick question, do you currently have a website or would this be your first one?',
  TEXT_2_DECISION_MAKER: 'Are you the one who handles marketing decisions for {companyName}, or is there someone else I should loop in?',
  TEXT_3_FORM_LINK: 'Perfect here\'s a quick form to fill out with your business info, logo, and photos. Takes about 5-10 minutes and we\'ll have your site built from it: {formUrl}',
}

const STAGE_INSTRUCTIONS: Record<string, (ctx: ConversationContext, qf?: Record<string, string>, pf?: Record<string, string>) => string> = {
  INITIATED: (ctx) =>
    `Send the opening message. The lead has shown interest (via ${ctx.conversation.entryPoint.replace(/_/g, ' ').toLowerCase()}). Introduce yourself briefly and ask if they've had a chance to look at their preview site. Include the booking link.
If they came via POSITIVE_REPLY or SMS_REPLY: "Hey ${ctx.lead.firstName || ''}! Thanks for getting back to us about ${ctx.lead.companyName}. Did you get a chance to check out the site we built? If you're interested, Andrew can walk you through everything on a quick call: ${ctx.bookingLink || ''}"
If they came via PREVIEW_CTA: "Hey ${ctx.lead.firstName || ''}! Saw you checked out the preview for ${ctx.lead.companyName}. Glad you liked it! Want to hop on a quick call with Andrew to get it live? ${ctx.bookingLink || ''}"
Set questionAsked to "Q1_WEBSITE" after sending.`,

  QUALIFYING: (ctx) => {
    return `You have two qualifying questions. Once both are answered, push the booking link hard.
Q1 (if not asked): "Do you currently have a website or would this be your first one?"
Q2 (if not asked): "Are you the one who handles these decisions for ${ctx.lead.companyName}, or should I loop someone else in?"
Once both answered: "Perfect! Andrew can show you exactly how we'd get ${ctx.lead.companyName} more visible online. Free 15-min call, pick any time: ${ctx.bookingLink || ''}"
Then set nextStage to COMPLETED if they book, or stay in QUALIFYING if they keep chatting.
Do NOT ask more than these 2 questions. Every extra question is a chance to lose them.`
  },

  COLLECTING_INFO: (ctx) => {
    return `This stage is being simplified. If the conversation lands here, treat it like QUALIFYING — ask any remaining qualifying question (Q1 or Q2), then push the booking link. Do not collect services, hours, photos, or form data. The meeting handles all of that.
Push booking: ${ctx.bookingLink || ''}`
  },

  // TEARDOWN: Stage BUILDING gutted. Was: kept lead engaged while site was being built.
  // Setting Engine spec will replace with meeting-booking logic.
  BUILDING: () =>
    `This stage is temporarily disabled. Respond warmly if the lead texts.`,

  // TEARDOWN: Stage PREVIEW_SENT gutted. Was: handled preview review, approval vs edit detection, payment routing.
  // Setting Engine spec will replace with meeting-booking logic.
  PREVIEW_SENT: () => {
    return `This stage is temporarily disabled. Respond warmly if the lead texts.`
  },

  // TEARDOWN: Stage EDIT_LOOP gutted. Was: collected edit feedback, routed to payment on approval.
  // Setting Engine spec will replace with meeting-booking logic.
  EDIT_LOOP: () => {
    return `This stage is temporarily disabled. Respond warmly if the lead texts.`
  },

  // TEARDOWN: Stage PAYMENT_SENT gutted. Was: handled payment link follow-ups and objection handling.
  // Setting Engine spec will replace with meeting-booking logic.
  PAYMENT_SENT: () => {
    return `This stage is temporarily disabled. Respond warmly if the lead texts.`
  },

  STALLED: (ctx) => {
    return `The lead hasn't responded in a while. Send ONE short, value-driven follow-up with the booking link.
Good approaches:
- Reference something specific about their business: "Hey ${ctx.lead.firstName || ''}, I noticed ${ctx.lead.companyName} doesn't show up on the first page of Google for ${(ctx.lead.industry || 'your industry').replace(/_/g, ' ').toLowerCase()} in ${ctx.lead.city || 'your area'}. Andrew can show you how to fix that in 15 min: ${ctx.bookingLink || ''}"
- Social proof: "Just helped another ${(ctx.lead.industry || 'local').replace(/_/g, ' ').toLowerCase()} business get 12 new calls in their first week. Happy to show you how — grab a time: ${ctx.bookingLink || ''}"
- Simple check-in: "Hey ${ctx.lead.firstName || ''}, your preview site for ${ctx.lead.companyName} is still ready to go. Want to chat about getting it live? ${ctx.bookingLink || ''}"
BAD follow-ups (NEVER send):
- "Just checking in" / "following up" / "circling back" — these get ignored
- Anything without the booking link
- Anything pushy or desperate
If they still don't respond after this follow-up, do not send another. Wait for them to come back.`
  },

  // TEARDOWN: Stage PENDING_APPROVAL gutted. Was: waited for admin payment link approval.
  // Setting Engine spec will replace with meeting-booking logic.
  PENDING_APPROVAL: () => {
    return `This stage is temporarily disabled. Respond warmly if the lead texts.`
  },

  COMPLETED: (ctx) =>
    `The meeting has been booked! If the lead messages:
- Confirm the meeting time: "Your call with Andrew is set for [time]. Looking forward to it!"
- Be warm and helpful
- Do NOT try to sell anything else
- Do NOT discuss pricing
- If they ask what to prepare: "Nothing needed! Andrew will have your preview site ready to walk through. Just show up and he'll take care of everything."
If they want to reschedule: "No problem! Here's the link to pick a new time: ${ctx.bookingLink || ''}"`,

  CLOSED_LOST: (ctx) =>
    `This conversation was marked as lost. If the lead reaches back out:
- Be warm and welcoming: "Hey ${ctx.lead.firstName || ''}! Great to hear from you again."
- Don't bring up the past rejection
- Casually mention the booking link: "If you're ever interested in chatting about ${ctx.lead.companyName}'s online presence, Andrew's always happy to hop on a quick call: ${ctx.bookingLink || ''}"
- Keep it low-pressure`,
}

// ============================================
// Format Helpers (pure functions)
// ============================================

function formatMessages(messages: Array<{ direction: string; content: string }>): string {
  if (messages.length === 0) return 'No messages yet.'

  return messages.map(m => {
    const role = m.direction === 'INBOUND' ? 'LEAD' : 'TEAM'
    return `${role}: ${m.content}`
  }).join('\n')
}

function formatCollectedData(data: Record<string, unknown> | null): string {
  if (!data || Object.keys(data).length === 0) return 'None yet'
  return JSON.stringify(data, null, 2)
}

function formatQuestionsAsked(questions: string[] | null): string {
  if (!questions || questions.length === 0) return 'None yet'
  return questions.join(', ')
}

function formatEnrichedServices(services: unknown): string {
  if (!services) return 'None'
  if (Array.isArray(services)) return services.join(', ')
  return String(services)
}

function formatEnrichedHours(hours: unknown): string {
  if (!hours) return 'None'
  if (typeof hours === 'string') return hours
  if (typeof hours === 'object') return JSON.stringify(hours)
  return String(hours)
}

function formatEnrichedPhotos(photos: unknown): string {
  if (!photos) return '0'
  if (Array.isArray(photos)) return String(photos.length)
  return '0'
}

function formatCallHistory(calls: Array<{ dispositionResult?: string | null; notes?: string | null; connectedAt?: string | null; duration?: number | null; startedAt: string }> | undefined): string {
  if (!calls || calls.length === 0) return ''
  const lines = calls.map(c => {
    const date = new Date(c.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const connected = c.connectedAt ? 'Connected' : 'Not connected'
    const dur = c.duration ? `${Math.floor(c.duration / 60)}m${c.duration % 60}s` : ''
    const dispo = c.dispositionResult?.replace(/_/g, ' ') || 'No disposition'
    const notes = c.notes ? ` Notes: "${c.notes}"` : ''
    return `- ${date}: ${connected}${dur ? `, ${dur}` : ''}, ${dispo}${notes}`
  })
  return `\n[CALL HISTORY]\nRep calls to this lead:\n${lines.join('\n')}\n`
}

// TEARDOWN: formatUpsellTags removed. Was: formatted upsell product names and prices.

// ============================================
// buildPreClientSystemPrompt()
// ============================================

export async function buildPreClientSystemPrompt(context: ConversationContext): Promise<string> {
  const { conversation, lead, messages, collectedData, questionsAsked } = context
  const stage = conversation.stage
  // Load custom scenario overrides from settings
  const templates = await getScenarioTemplates()
  const customOverride = templates?.scenarios?.[stage]
  const hasOverride = customOverride?.enabled && customOverride?.instructions_override?.trim()

  // Load SmartChat settings for form base URL (white-label support)
  let formBaseUrl = ''
  try {
    const { getSmartChatSettings } = require('./message-batcher')
    const smartChatSettings = await getSmartChatSettings()
    formBaseUrl = smartChatSettings.formBaseUrl || ''
  } catch { /* non-critical */ }

  // Merge qualifying flow templates + formBaseUrl for stage instructions
  const qualifyingFlow = {
    ...(templates?.qualifyingFlow || {}),
    _formBaseUrl: formBaseUrl,
  }

  // TEARDOWN: Payment flow templates removed.
  const paymentFlowTemplates: Record<string, string> = {}

  // Get stage-specific instructions (custom override takes priority)
  let stageInstructions: string
  if (hasOverride) {
    stageInstructions = customOverride!.instructions_override
  } else {
    const stageInstructionFn = STAGE_INSTRUCTIONS[stage]
    stageInstructions = stageInstructionFn
      ? stageInstructionFn(context, qualifyingFlow, paymentFlowTemplates)
      : `Unknown stage: ${stage}. Respond helpfully and set escalate: true.`
  }

  // Load AI learning context from conversation outcomes
  let learningContext = ''
  try {
    const { getLearningContext } = await import('./conversation-outcomes')
    const ctx = await getLearningContext(lead.industry || 'GENERAL', stage)
    if (ctx) learningContext = `\n${ctx}\n`
  } catch { /* learning system not critical */ }

  return `You are a team member at Bright Automations, a company that builds professional websites and full online presence packages for local service businesses. You're texting a business owner who has seen (or will see) a free preview website you built for their company.

[YOUR ONLY GOAL]
Get the lead to book a free 15-minute strategy call with Andrew.
Booking link: ${context.bookingLink || '(not configured yet)'}

[RULES]
- Send ONE message at a time. This is SMS — keep it under 300 characters when possible.
- Always acknowledge what the lead said before pivoting to booking.
- Use their first name naturally. Don't overuse it.
- Be warm, casual, and helpful — like a friend who knows about websites, not a salesperson.
- Include the booking link in every other message at minimum. If you go 2 messages without it, include it.
- NEVER discuss pricing, monthly costs, or fees. If asked: "Great question — Andrew covers all the pricing options on the call. It's really affordable though: ${context.bookingLink || ''}"
- NEVER try to close a deal, collect payment, or ask for credit card info.
- NEVER mention AI, Claude, bots, or automation. If asked who you are: "This is the Bright Automations team!"
- NEVER offer discounts or make promises about specific results.
- If asked to speak to a human/person/manager: "Absolutely! That's exactly what the strategy call is for. Andrew runs it personally: ${context.bookingLink || ''}" and set escalate: false (the booking link IS the human connection).
- If the lead asks what's included: "The site comes with SEO optimization, SSL security, mobile optimization, Google Business Profile optimization, analytics monitoring — the full package. Andrew can walk you through everything on a quick call: ${context.bookingLink || ''}"
- If the lead says they already have a website: "No worries! The call isn't about replacing anything — Andrew can show you what he found about your online presence and some quick wins to get more customers finding you. Worth 15 min: ${context.bookingLink || ''}"
- If the lead says they're busy: "Totally get it! It's only 15 minutes and you pick the time. ${context.bookingLink || ''}"
- If the lead goes silent, don't send more than one follow-up without a response.

[CURRENT STAGE: ${stage}]
${stageInstructions}

[LEAD CONTEXT]
Name: ${lead.firstName || '(none)'} ${lead.lastName || ''}
Company: ${lead.companyName}
Industry: ${(lead.industry || 'GENERAL').replace(/_/g, ' ')}
City/State: ${[lead.city, lead.state].filter(Boolean).join(', ') || 'Unknown'}
Entry Point: ${conversation.entryPoint}
Website: ${lead.website || 'None found'}
Preview: ${lead.previewUrl || 'Not built yet'}
Booking Link: ${context.bookingLink || '(not configured)'}

Enriched Data:
- Services found online: ${formatEnrichedServices(lead.enrichedServices)}
- Hours found online: ${formatEnrichedHours(lead.enrichedHours)}
- Google rating: ${lead.enrichedRating ?? 'N/A'} (${lead.enrichedReviews ?? 0} reviews)
- Photos available: ${formatEnrichedPhotos(lead.enrichedPhotos)}

Data Collected So Far:
${formatCollectedData(collectedData)}

Questions Already Asked:
${formatQuestionsAsked(questionsAsked)}
${formatCallHistory((lead as any).dialerCalls)}
${learningContext}
[CONVERSATION HISTORY]
${formatMessages(messages)}

[RESPONSE FORMAT]
You MUST respond with valid JSON only. No text before or after the JSON.
{
  "replyText": "Your SMS message to the lead",
  "extractedData": { ... any info they mentioned } or null,
  "nextStage": "STAGE_NAME" or null (only if stage should change),
  "questionAsked": "Q1_WEBSITE" | "Q2_DECISION_MAKER" | null,
  "readyToBuild": false,
  "escalate": true/false,
  "escalateReason": "reason" or null
}
IMPORTANT: readyToBuild should always be false in the new pipeline — we don't build sites from conversations anymore. The site is already built as a preview. Just get them to book.`
}

// ============================================
// getFirstMessageTemplate()
// ============================================

const FIRST_MESSAGE_TEMPLATES: Record<string, string> = {
  INSTANTLY_REPLY: `Hey {firstName}! Thanks for reaching out about {companyName}. We actually built a free preview site for you — want to take a look and hop on a quick call with Andrew to get it live?`,
  SMS_REPLY: `Hey {firstName}! Great to hear from you. We built a preview site for {companyName} — Andrew can walk you through everything on a quick 15-min call. Want to grab a time?`,
  REP_CLOSE: `Hey {firstName}! Just spoke with our team about {companyName}. Andrew would love to show you what we can do on a quick call. Here's the link to book:`,
  PREVIEW_CTA: `Hey {firstName}! Saw you checked out the preview we built for {companyName}. Glad you liked it! Andrew can walk you through getting it live — grab a time here:`,
  POSITIVE_REPLY: `Hey {firstName}! Thanks for getting back to us about {companyName}. Andrew can show you everything on a quick 15-min call — want to grab a time?`,
}

export async function getFirstMessageTemplate(
  entryPoint: string,
  lead: { firstName: string; companyName: string; id?: string; lastName?: string | null; email?: string | null; phone?: string | null }
): Promise<string> {
  // Check for custom first message templates from settings
  const templates = await getScenarioTemplates()
  const customTemplate = templates?.firstMessages?.[entryPoint]

  // Priority: custom first message > qualifying flow Text 1 (for CTA) > hardcoded defaults
  let template: string
  if (customTemplate?.trim()) {
    template = customTemplate
  } else if (templates?.qualifyingFlow?.TEXT_1_OPENING?.trim() && entryPoint === 'PREVIEW_CTA') {
    // CTA clicks use the qualifying flow Text 1 directly since that's the canonical opener
    template = templates.qualifyingFlow.TEXT_1_OPENING
  } else {
    template = FIRST_MESSAGE_TEMPLATES[entryPoint] || FIRST_MESSAGE_TEMPLATES.SMS_REPLY
  }

  let result = template
    .replace(/\{firstName\}/g, lead.firstName || '')
    .replace(/\{companyName\}/g, lead.companyName || '')
  // Clean up artifacts from empty variable substitution
  result = result
    .replace(/\s+/g, ' ')
    .replace(/,\s*([!?.])/g, '$1')
    .replace(/\s([!?,.])/g, '$1')
    .trim()

  // Append booking link if available
  try {
    const { getBookingLink } = await import('./booking-service')
    const bookingLink = lead.id ? await getBookingLink(lead as any) : ''
    if (bookingLink && !result.includes(bookingLink)) {
      result = result + ' ' + bookingLink
    }
  } catch {}

  return result
}

// ============================================
// buildPostClientSystemPrompt()
// ============================================

export function buildPostClientSystemPrompt(context: {
  companyName: string
  plan?: string
  monthlyRevenue?: number
  siteUrl?: string
  healthScore?: number
  daysSinceLaunch?: number
  messages: Array<{ direction: string; content: string }>
  onboardingStep?: number
  onboardingData?: Record<string, unknown>
  onboardingStageTemplate?: string
}): string {
  const {
    companyName,
    plan = 'Standard',
    monthlyRevenue = 99,
    siteUrl = 'N/A',
    healthScore = 100,
    daysSinceLaunch = 0,
    messages,
    onboardingStep,
    onboardingData,
    onboardingStageTemplate,
  } = context

  const onboardingSection = onboardingStep !== undefined && onboardingStep > 0 && onboardingStep < 7
    ? buildOnboardingPromptSection(onboardingStep, onboardingData || {}, companyName, onboardingStageTemplate)
    : ''

  // During onboarding, include onboarding-specific intents in the response format
  const onboardingIntents = onboardingStep !== undefined && onboardingStep > 0 && onboardingStep < 7
    ? ' | "DOMAIN_OWN" | "DOMAIN_REGISTER" | "GO_LIVE_CONFIRM" | "CONTENT_APPROVED"'
    : ''

  const onboardingResponseFields = onboardingStep !== undefined && onboardingStep > 0 && onboardingStep < 7
    ? `,
  "domainName": "extracted domain name" or null`
    : ''

  return `[IDENTITY]
You are the account manager for Bright Automations. You manage the ongoing relationship with ${companyName}, a paying client. Your tone is supportive, professional, and helpful.

[POST-CLIENT RULES]
- Be helpful and responsive. This is a paying customer.
- Handle edit requests: parse what they want changed and confirm you'll handle it.
- If they mention cancelling, wanting to leave, or dissatisfaction: set escalate: true immediately.
- TEARDOWN: Upsell pitching removed.
- If they give positive feedback: thank them, ask for a Google review.
- For billing questions: provide basic info ($${monthlyRevenue}/month hosting), escalate billing disputes.
- Keep messages professional but warm.
- NEVER mention AI, Claude, bots, automation, or that you're automated.
- If asked who you are: "This is the Bright Automations team!"
- NEVER give the preview URL as their permanent domain.
- NEVER say edits are done unless you have explicit confirmation they were completed.

[SMS FORMATTING RULES]
- Never use dashes, bullet points, numbered lists, or colons in texts.
- Never use em-dashes (\u2014) or semicolons.
- Max 2 sentences per text. Keep it SHORT.
- Write like you're texting a friend who owns a business, not writing an email.
- Use their first name, not their company name.
- Never say "I'd be happy to" or "I'd love to" or "absolutely."
- Don't use exclamation marks more than once per message.
- If they ask a question, answer it directly.

[iMESSAGE REACTIONS]
Messages prefixed with [REACTION:] are iMessage tapback reactions, not typed text.
- Like/Love on a question = "Yes". Move forward naturally.
- Dislike = they disagree or are unhappy. Respond with empathy.
- Question mark = they're confused. Clarify simply.
- Keep reaction responses extra short (1 sentence). Don't over-respond to a tap.
${onboardingSection}
[CLIENT CONTEXT]
Company: ${companyName}
Plan: ${plan} | Monthly: $${monthlyRevenue}
Site: ${siteUrl}
Health Score: ${healthScore}/100
Days Since Launch: ${daysSinceLaunch}


[CONVERSATION HISTORY]
${formatMessages(messages)}

[RESPONSE FORMAT]
You MUST respond with valid JSON only. No text before or after the JSON.
{
  "replyText": "Your message",
  "intent": "EDIT_REQUEST" | "QUESTION" | "CANCEL_SIGNAL" | "POSITIVE_FEEDBACK" | "BILLING" | "GENERAL"${onboardingIntents},
  "editRequest": {
    "description": "Clear, specific instruction describing what to change on the site",
    "complexity": "simple" or "medium" or "complex"
    // simple = font change, color swap, text edit, image swap, spacing tweak, show/hide element, make something bigger/smaller
    // medium = rearranging layout, adding a new section, changing navigation structure, redesigning a component
    // complex = adding a new page, major redesign, functionality changes, form modifications, adding interactive features
  } or null,
  "extractedData": {
    "services": ["service1", "service2"],
    "hours": "business hours",
    "photos": ["url1"],
    "logo": "url",
    "companyName": "confirmed or corrected name",
    "aboutStory": "owner's own words about their company",
    "serviceArea": "cities or counties they serve",
    "colorPrefs": "brand colors or style preference"
  } or null,
  "escalate": true/false,
  "escalateReason": "reason" or null${onboardingResponseFields}
}
IMPORTANT: If the client provides ANY business information (hours, services, photos, about their company, service area, etc.) — even casually — you MUST capture it in extractedData. Every piece of info improves their site. Never just acknowledge data without extracting it.`
}

function buildOnboardingPromptSection(step: number, data: Record<string, unknown>, _companyName: string, stageTemplate?: string): string {
  const stagingUrl = data.stagingUrl as string || 'being prepared'
  const requestedDomain = (data.domainPreference || data.requestedDomain) as string || null

  const sections: Record<number, string> = {
    1: `
[ONBOARDING — WELCOME]
This is a brand-new paying client. Be excited and welcoming. Let them know you're here to help get their site set up. Don't ask about domains yet — that comes automatically in the next step.`,

    2: `
[ONBOARDING — DOMAIN COLLECTION]
You need to collect their domain preference. Parse their response carefully:

If they say they HAVE a domain (mention any .com, .net, .org, etc.):
- Confirm the domain they gave you
- Say something like "Got it, we'll set that up. You'll need to update DNS settings — I'll send you simple instructions."
- Set intent to "DOMAIN_OWN" and extract the domain into "domainName"

If they say they DON'T have one or want help:
- Suggest 2-3 options based on their company name
- When they pick one: set intent to "DOMAIN_REGISTER" and put their choice in "domainName"

If they're confused about domains:
- Explain simply: "A domain is your website address, like google.com"
- Then offer to help pick one

NEVER give them the preview URL as their domain.`,

    3: `
[ONBOARDING — CONTENT REVIEW]
Their staging site is at: ${stagingUrl}
${requestedDomain ? `Domain preference: ${requestedDomain}` : ''}

If this is the FIRST message at this step (no edits requested yet), send the staging URL and ask them to review.

If they say it looks good (any positive response like "perfect", "love it", "looks great"):
- Set intent to "CONTENT_APPROVED"
- Tell them you'll get their domain set up within 48 hours

If they request changes (hours, phone, photos, services, text, etc.):
- Set intent to "EDIT_REQUEST" with the details
- Say "Got it, I'll pass that to the team. They'll update it and I'll let you know when it's done."
- Do NOT say the changes are done or that you're making them.`,

    4: `
[ONBOARDING — DOMAIN SETUP]
The team is setting up their domain. If they ask about progress, let them know it usually takes 24-48 hours.
Domain: ${requestedDomain || 'Being configured'}`,

    5: `
[ONBOARDING — DNS VERIFICATION]
Their domain is being verified. DNS changes can take up to 48 hours to propagate.
Domain: ${requestedDomain || 'Unknown'}
If they ask about timing, reassure them and say you're monitoring it.`,

    6: `
[ONBOARDING — GO-LIVE CONFIRMATION]
Their site should be live. Ask them to check it out and confirm it looks good.
If they confirm (positive response like "looks good", "perfect", "love it"):
- Set intent to "GO_LIVE_CONFIRM"
- Say something like "Glad you like it! You're all set. I'll check in from time to time with performance updates. If you ever need anything changed, just text me."

If they request changes: set intent to "EDIT_REQUEST" with details.`,
  }

  let prompt = sections[step] || ''

  // Append admin's custom stage template if set in Settings > Post-AQ
  if (stageTemplate) {
    prompt += `\n\n[ADMIN ONBOARDING INSTRUCTIONS]\n${stageTemplate}`
  }

  return prompt
}

// ============================================
// getScenarioTemplates() — load custom overrides from settings
// ============================================

let scenarioCache: { data: any; ts: number } | null = null
const SCENARIO_CACHE_TTL = 60_000 // 1 minute

async function getScenarioTemplates(): Promise<{ scenarios: Record<string, { instructions_override: string; enabled: boolean }>; firstMessages: Record<string, string>; qualifyingFlow?: Record<string, string>; paymentFlow?: Record<string, string> } | null> {
  // Simple in-memory cache to avoid hitting DB on every message
  if (scenarioCache && Date.now() - scenarioCache.ts < SCENARIO_CACHE_TTL) {
    return scenarioCache.data
  }
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'close_engine_scenarios' },
    })
    const data = (setting?.value as any) || null
    scenarioCache = { data, ts: Date.now() }
    return data
  } catch (error) {
    console.warn('[CloseEngine] Failed to load scenario templates:', error)
    return null
  }
}

// ============================================
// checkEscalation() — helper for message processor
// ============================================

export function checkEscalation(messageText: string): { shouldEscalate: boolean; keyword: string | null } {
  const lower = messageText.toLowerCase()
  for (const keyword of ESCALATION_KEYWORDS) {
    if (lower.includes(keyword)) {
      return { shouldEscalate: true, keyword }
    }
  }
  return { shouldEscalate: false, keyword: null }
}
