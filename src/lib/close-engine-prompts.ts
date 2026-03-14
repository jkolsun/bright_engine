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
  INITIATED: () =>
    `Send the opening message. Reference how they showed interest (see entry point). Ask if they currently have a website or if this would be their first one (Q1). Be warm and excited.`,

  QUALIFYING: (ctx, qf) => {
    const asked = ctx.questionsAsked || []
    const collected = ctx.collectedData || {}
    const lead = ctx.lead
    const flow = { ...DEFAULT_QUALIFYING_FLOW, ...qf }

    // Compute form URL using settings-based base URL (white-label support)
    const baseUrl = flow._formBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'
    const formUrl = `${baseUrl}/onboard/${lead.id}`

    // Resolve variables in Q2 template
    const q2Text = flow.TEXT_2_DECISION_MAKER
      .replace(/\{firstName\}/g, lead.firstName || '')
      .replace(/\{companyName\}/g, lead.companyName || 'the business')

    // Resolve variables in form link template
    const formLinkText = flow.TEXT_3_FORM_LINK
      .replace(/\{firstName\}/g, lead.firstName || '')
      .replace(/\{companyName\}/g, lead.companyName || '')
      .replace(/\{formUrl\}/g, formUrl)

    // 2 qualifying questions — quick gate check, then send the form
    const queue: string[] = []
    if (!asked.includes('Q1_WEBSITE') && !collected.hasWebsite) queue.push(`Q1: "${flow.TEXT_1_OPENING.split(/[.?!]\s/).pop()?.trim() || 'Do you currently have a website or would this be your first one?'}"`)
    if (!asked.includes('Q2_DECISION_MAKER') && !collected.isDecisionMaker) queue.push(`Q2: "${q2Text}"`)

    const bothAnswered = queue.length === 0

    return `You are doing a quick 2-question gate check before sending the onboarding form. The lead already saw their preview site and clicked the CTA — they're interested. Your job is NOT to re-pitch or collect business info. The form handles all of that. You're just confirming they're a real buyer.

Questions still needed: ${queue.length > 0 ? queue.join(' | ') : 'NONE — Both questions are answered!'}

EXACT TEXT for Q2 (adapt naturally but keep the meaning):
"${q2Text}"
${bothAnswered ? `
BOTH QUESTIONS ARE ANSWERED. Send the form link NOW in your response. Do NOT wait for another message.
The ACTUAL form URL is: ${formUrl}
Send something close to this: "${formLinkText}"
CRITICAL: Include the FULL URL exactly as shown above in your replyText. Do NOT write "{formUrl}" or any placeholder — write the actual URL: ${formUrl}
Set nextStage to COLLECTING_INFO and set questionAsked to "FORM_LINK_SENT".
` : ''}
RULES:
- Ask ONE question at a time. Keep it casual.
- If they answer both questions in one message (like "yeah I don't have a site and I'm the owner"), recognize it, extract both answers, and SEND THE FORM LINK IMMEDIATELY in the same response. Include the full URL: ${formUrl} (copy this exact URL, do NOT use a placeholder). Set nextStage to COLLECTING_INFO and questionAsked to "FORM_LINK_SENT".
- Quick acknowledgment before the next question ("Got it!" "Perfect!").
- If the client goes off-script and starts talking about their business or services unprompted, roll with it. Don't force the qualifying questions — if they're clearly interested and engaged, just send the form: ${formUrl}
- NEVER write "{formUrl}" in your response — always use the actual URL: ${formUrl}
- When both questions are answered, include the form link in your response. Don't make them wait for another turn.
- Extract data: set hasWebsite to their answer (true/false/"replacing"), set isDecisionMaker to true/false.
- The goal is: get to the form as fast as possible. These questions are a gate check, not an interview.`
  },

  COLLECTING_INFO: (ctx, qf) => {
    const lead = ctx.lead
    const collected = ctx.collectedData || {}
    const asked = ctx.questionsAsked || []
    const flow = { ...DEFAULT_QUALIFYING_FLOW, ...qf }

    // Compute form URL using settings-based base URL (white-label support)
    const baseUrl = flow._formBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://preview.brightautomations.org'
    const formUrl = `${baseUrl}/onboard/${lead.id}`
    const onboardingStatus = (lead as any).onboardingStatus || 'NOT_STARTED'
    const formCompleted = onboardingStatus === 'COMPLETED'

    // Resolve variables in form link template
    const formLinkText = flow.TEXT_3_FORM_LINK
      .replace(/\{firstName\}/g, lead.firstName || '')
      .replace(/\{companyName\}/g, lead.companyName || '')
      .replace(/\{formUrl\}/g, formUrl)

    // Check what high-value data is still missing
    const missing: string[] = []
    if (!collected.aboutStory) missing.push('company story')
    if (!collected.differentiator) missing.push('what sets them apart')
    if (!lead.logo && !collected.logo) missing.push('logo')
    if (!collected.testimonial) missing.push('customer testimonial')

    // Check photo situation
    const enrichedPhotos = Array.isArray(lead.enrichedPhotos) ? lead.enrichedPhotos : []
    const clientPhotos = Array.isArray(lead.photos) ? lead.photos : []
    if (enrichedPhotos.length < 3 && clientPhotos.length < 1 && !collected.photos) {
      missing.push('project photos')
    }

    if (formCompleted) {
      // Form already submitted — the data is in. Skip to building.
      return `The client already filled out the onboarding form with their business info, logo, photos, and services. All critical data collected.
RULES:
- Set readyToBuild: true immediately.
- Tell them: "We got all your info — building your site now! You'll get a preview link soon."
- If they text anything, respond warmly.`
    }

    // Check if we already sent the form link
    const formLinkSent = asked.includes('FORM_LINK_SENT')

    if (!formLinkSent) {
      return `Core questions done! Now send the form link.
The ACTUAL form URL is: ${formUrl}

YOUR NEXT MESSAGE should be close to this (adapt naturally):
"${formLinkText}"

RULES:
- Include the FULL form URL in your message. Copy it exactly: ${formUrl}
- NEVER write "{formUrl}" — always use the actual URL shown above.
- Set questionAsked to "FORM_LINK_SENT" so we know you sent it.
- Don't set readyToBuild yet — wait for the form to be filled.
- If the lead seems impatient, you can ALSO set readyToBuild: true (we'll build with what we have).
- Keep it short and casual. One or two sentences max.`
    }

    // Form link already sent but not completed — nudge or collect via chat
    return `You already sent the form link. The client hasn't filled it out yet.
${missing.length > 0 ? `Still missing: ${missing.join(', ')}.` : 'All critical data collected.'}
RULES:
- If it's been a while (multiple messages without form completion), gently nudge: "Did you get a chance to fill out that form? Here's the link again: ${formUrl}"
- If the lead texts info directly (services, story, etc.) instead of using the form, that's fine — collect it via conversation as normal.
- If they send photos via MMS, acknowledge them.
- When you have services + (about story OR differentiator) + at least 7 questions answered total, set readyToBuild: true.
- If the lead says "that's all" / "just build it", set readyToBuild: true immediately.
- Maximum 3 more follow-up questions. Don't be annoying.`
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
    const hasPreview = !!ctx.lead.previewUrl
    return `The lead hasn't responded in a while. Send ONE short, value-driven follow-up. NOT a generic "just checking in" message.

GOOD follow-ups (pick one approach, adapt to their situation):
${hasPreview ? `- Reference their preview: "Hey ${ctx.lead.firstName || ''}, your ${ctx.lead.companyName} site is still ready to go. Want me to send the link again?"` : ''}
- Add social proof: "Just launched a site for another ${(ctx.lead.industry || 'local').replace(/_/g, ' ')} business — they got 12 new calls the first week"
- Time-based urgency (only if true): "Your preview stays active for another few days if you want to take another look"
- Ask a question they can easily answer: "Quick question — would you prefer customers to call or fill out a form on your site?"

BAD follow-ups (NEVER send these):
- "Just checking in" / "following up" / "circling back" — these get ignored
- "Is time the only thing holding you back?" — meaningless question
- "Don't want to miss your window" — fake urgency
- Any message that doesn't give them a reason to respond
- Anything pushy or desperate

The lead is cold. Give them a REASON to re-engage, don't just ask if they're still interested.`
  },

  // TEARDOWN: Stage PENDING_APPROVAL gutted. Was: waited for admin payment link approval.
  // Setting Engine spec will replace with meeting-booking logic.
  PENDING_APPROVAL: () => {
    return `This stage is temporarily disabled. Respond warmly if the lead texts.`
  },

  COMPLETED: () =>
    `This conversation is complete. The lead has paid and the site is being set up. If they message, congratulate them and let them know the team will be in touch for onboarding.`,

  CLOSED_LOST: () =>
    `This conversation has been marked as closed/lost. If the lead reaches out again, be warm and see if they've changed their mind. Don't be pushy.`,
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

  return `You are a meeting booking assistant for Bright Automations. Your ONLY job is to get the lead to book a meeting. Do not discuss pricing. Do not try to close deals. Do not pitch services. Just get them to book a meeting. PLACEHOLDER — Full Setting Engine prompt will replace this in the next spec.

[CURRENT STAGE: ${stage}]
${stageInstructions}

[LEAD CONTEXT]
Name: ${lead.firstName || '(none)'} ${lead.lastName || ''}
Company: ${lead.companyName}
Industry: ${(lead.industry || 'GENERAL').replace(/_/g, ' ')}
City/State: ${[lead.city, lead.state].filter(Boolean).join(', ') || 'Unknown'}
Entry Point: ${conversation.entryPoint}
Website: ${lead.website || 'None found'}

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
  "extractedData": {
    "services": ["service1", "service2"],
    "aboutStory": "owner's own words about their company",
    "differentiator": "what makes them different from competitors",
    "serviceArea": "cities or counties they serve",
    "yearsInBusiness": "number or description like '15 years'",
    "testimonial": "customer quote provided by the owner",
    "certifications": ["BBB", "Licensed & Insured", "etc"],
    "hours": "business hours",
    "photos": ["url1"],
    "logo": "url",
    "companyName": "confirmed or corrected name",
    "colorPrefs": "brand colors or style preference",
    "specialRequests": "anything special they mentioned"
  } or null,
  "nextStage": "STAGE_NAME" or null (only if stage should change),
  "questionAsked": "Q1_WEBSITE" | "Q2_DECISION_MAKER" | "FORM_LINK_SENT" | "DYNAMIC_1" etc. or null,
  "readyToBuild": true/false,
  "escalate": true/false,
  "escalateReason": "reason" or null
}
IMPORTANT: Extract ALL data from their messages. If they mention their years in business, service area, or what makes them different — even if you didn't ask — capture it in extractedData. Every piece of info improves their site.`
}

// ============================================
// getFirstMessageTemplate()
// ============================================

const FIRST_MESSAGE_TEMPLATES: Record<string, string> = {
  INSTANTLY_REPLY: `Hey {firstName}! Saw your reply about the website — excited to get {companyName} set up. Quick question, do you currently have a website or would this be your first one?`,
  SMS_REPLY: `Hey {firstName}! Great to hear from you. We can get {companyName}'s site live fast. Quick question, do you currently have a website or would this be your first one?`,
  REP_CLOSE: `Hey {firstName}! Just spoke with the team — let's get your site live. Quick question, do you currently have a website for {companyName} or would this be your first one?`,
  PREVIEW_CTA: `Hey {firstName}! Saw you checked out the preview we built for {companyName}. We can get this live for you in no time. Quick question, do you currently have a website or would this be your first one?`,
}

export async function getFirstMessageTemplate(
  entryPoint: string,
  lead: { firstName: string; companyName: string }
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
  upsells?: string[]
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
    upsells = [],
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
Active Add-ons: ${upsells.length > 0 ? upsells.join(', ') : 'None'}

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
