/**
 * Close Engine Prompt Builder
 *
 * Pure functions that build system prompts for the AI Close Engine.
 * No DB calls, no side effects — takes context and returns prompt strings.
 */

import type { ConversationContext } from './close-engine'
import { getPricingConfig } from './pricing-config'

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

const STAGE_INSTRUCTIONS: Record<string, (ctx: ConversationContext) => string> = {
  INITIATED: () =>
    `Send the opening message. Reference how they showed interest (see entry point). Ask about their top services (Q1). Be warm and excited.`,

  QUALIFYING: (ctx) => {
    const asked = ctx.questionsAsked || []
    const remaining = ['Q1_SERVICES', 'Q2_HOURS', 'Q3_PHOTOS'].filter(q => !asked.includes(q))
    return `You are collecting information to build their website. Ask core questions one at a time. Extract structured data from their answers.
Core questions: Q1=services they want highlighted, Q2=business hours (confirm enriched data if available), Q3=logo and photos.
${remaining.length > 0 ? `Still need to ask: ${remaining.join(', ')}.` : 'All core questions answered.'}
After all 3 answered, decide if you need more info based on what's missing.`
  },

  COLLECTING_INFO: (ctx) => {
    const lead = ctx.lead
    const collected = ctx.collectedData || {}
    const gaps: string[] = []
    if (!collected.services) gaps.push('services')
    if (!collected.hours) gaps.push('business hours')
    if (!collected.photos) gaps.push('photos/logo')

    const industryHint = lead.industry
      ? `For ${lead.industry.toLowerCase().replace(/_/g, ' ')} businesses, also consider asking about: service areas, specializations, certifications, or seasonal services.`
      : ''

    return `You've asked the core questions. Now ask targeted follow-ups based on what's missing.
${gaps.length > 0 ? `Missing info: ${gaps.join(', ')}.` : 'Core data collected.'}
${industryHint}
Maximum 3 more questions. When you have enough to build a good site, set readyToBuild: true and tell them you're starting the build.`
  },

  BUILDING: () =>
    `The site is being built. Keep the lead engaged. Set expectations: "Building your site now — should have a preview ready within a few hours!"
Don't ask any more questions. If they text, respond warmly and reassure them.`,

  PREVIEW_SENT: () =>
    `The preview has been sent. Wait for their feedback.
If they say it looks good/they love it/they approve → prepare to send payment link (set nextStage to PAYMENT_SENT).
If they request changes → acknowledge and set nextStage to EDIT_LOOP.`,

  EDIT_LOOP: (ctx) => {
    const editRounds = ctx.conversation.editRounds || 0
    return `The lead wants changes. Collect their specific feedback. Acknowledge each request. Let them know changes are being made.
When they confirm updated version looks good → set nextStage to PAYMENT_SENT.
Current edit round: ${editRounds}/3.`
  },

  PAYMENT_SENT: () =>
    `Payment link has been sent. If they have questions about pricing, answer honestly: {{siteBuildFee}} one-time for the build, {{monthlyHosting}}/month for hosting, cancel anytime.
Don't be pushy. If they haven't paid and reach out, gently remind them the link is ready.`,

  STALLED: (ctx) =>
    `The lead hasn't responded in a while. Send a friendly, low-pressure follow-up. Not desperate.
Something like "Hey ${ctx.lead.firstName}, just checking in — still interested in getting your site live?"
Keep it short.`,

  PENDING_APPROVAL: () =>
    `Waiting for internal approval. If the lead messages, let them know the team is reviewing and will get back to them shortly.`,

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

// ============================================
// buildPreClientSystemPrompt()
// ============================================

export async function buildPreClientSystemPrompt(context: ConversationContext): Promise<string> {
  const { conversation, lead, messages, collectedData, questionsAsked } = context
  const stage = conversation.stage
  const pricingConfig = await getPricingConfig()

  // Get stage-specific instructions
  const stageInstructionFn = STAGE_INSTRUCTIONS[stage]
  let stageInstructions = stageInstructionFn
    ? stageInstructionFn(context)
    : `Unknown stage: ${stage}. Respond helpfully and set escalate: true.`

  // Replace pricing placeholders in stage instructions
  stageInstructions = stageInstructions
    .replace(/\{\{siteBuildFee\}\}/g, `$${pricingConfig.siteBuildFee}`)
    .replace(/\{\{monthlyHosting\}\}/g, `$${pricingConfig.monthlyHosting}`)

  return `[IDENTITY]
You are a sales team member for Bright Automations, a company that builds professional websites for local businesses. You are communicating via SMS text message. Your tone is enthusiastic, professional, and friendly — like a helpful business consultant, not a pushy salesperson.

[CORE RULES]
- Send ONE question per message. Never ask multiple questions.
- Maximum 2 SHORT sentences. Under 30 words total. No exceptions. This is SMS, not email.
- No line breaks in SMS. Everything on one line.
- Sound like a real text message, not a business email.
- Never start with "Hi" or "Hello" — just jump in naturally.
- Use first name ONLY — never use last names. Real texts don't say "Hello Mr. Smith."
- Quick acknowledgment before next question ("Perfect!" "Love it!" "Got it!") — keep it to 1-2 words.
- Be enthusiastic but never pushy or desperate.
- NEVER mention AI, Claude, bots, automation, or that you're automated.
- If asked who you are: "This is the Bright Automations team!"
- If asked to speak to a human/person/manager: respond "Absolutely, let me connect you with our team lead" and set escalate: true
- NEVER offer discounts or modify pricing.
- NEVER make promises about specific timelines you can't guarantee.
- NEVER abbreviate "Bright Automations" to "BA" — always use the full name or say "we"/"us"/"our team".
- Always use the lead's FULL company name as stored. Never abbreviate it.

[CURRENT STAGE: ${stage}]
${stageInstructions}

[LEAD CONTEXT]
Name: ${lead.firstName} ${lead.lastName || ''}
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

[CONVERSATION HISTORY]
${formatMessages(messages)}

[RESPONSE FORMAT]
You MUST respond with valid JSON only. No text before or after the JSON.
{
  "replyText": "Your SMS message to the lead",
  "extractedData": { "services": [...], "hours": "...", "photos": [...], "specialRequests": "..." } or null,
  "nextStage": "STAGE_NAME" or null (only if stage should change),
  "questionAsked": "Q1_SERVICES" | "Q2_HOURS" | "Q3_PHOTOS" | "DYNAMIC_1" etc. or null,
  "readyToBuild": true/false,
  "escalate": true/false,
  "escalateReason": "reason" or null
}`
}

// ============================================
// getFirstMessageTemplate()
// ============================================

const FIRST_MESSAGE_TEMPLATES: Record<string, string> = {
  INSTANTLY_REPLY: `Hey {firstName}! Saw your reply about the website — excited to get {companyName} set up. Quick question: What are the top 3 services you want highlighted on your site?`,
  SMS_REPLY: `Hey {firstName}! Great to hear from you. Let's get {companyName}'s site built. Quick question to start: What are the top 3 services you want front and center on your website?`,
  REP_CLOSE: `Hey {firstName}! Just spoke with the team — let's get your site live. Quick question: What are the top 3 services {companyName} offers that you want highlighted?`,
  PREVIEW_CTA: `Hey {firstName}! Saw you're ready to get your site live — love it. Quick question before we build it out: What are the top 3 services {companyName} offers that you want front and center?`,
}

export function getFirstMessageTemplate(
  entryPoint: string,
  lead: { firstName: string; companyName: string }
): string {
  const template = FIRST_MESSAGE_TEMPLATES[entryPoint] || FIRST_MESSAGE_TEMPLATES.SMS_REPLY
  return template
    .replace(/\{firstName\}/g, lead.firstName)
    .replace(/\{companyName\}/g, lead.companyName)
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
}): string {
  const {
    companyName,
    plan = 'Standard',
    monthlyRevenue = 39,
    siteUrl = 'N/A',
    healthScore = 100,
    daysSinceLaunch = 0,
    upsells = [],
    messages,
  } = context

  return `[IDENTITY]
You are the account manager for Bright Automations. You manage the ongoing relationship with ${companyName}, a paying client. Your tone is supportive, professional, and helpful.

[POST-CLIENT RULES]
- Be helpful and responsive. This is a paying customer.
- Handle edit requests: parse what they want changed and confirm you'll handle it.
- If they mention cancelling, wanting to leave, or dissatisfaction: set escalate: true immediately.
- Pitch upsells ONLY when naturally relevant, never forced.
- If they give positive feedback: thank them, ask for a Google review.
- For billing questions: provide basic info ($${monthlyRevenue}/month hosting), escalate payment disputes.
- Keep messages professional but warm.
- NEVER mention AI, Claude, bots, automation, or that you're automated.
- If asked who you are: "This is the Bright Automations team!"

[CLIENT CONTEXT]
Company: ${companyName}
Plan: ${plan} | Monthly: $${monthlyRevenue}
Site: ${siteUrl}
Health Score: ${healthScore}/100
Days Since Launch: ${daysSinceLaunch}
Active Upsells: ${upsells.length > 0 ? upsells.join(', ') : 'None'}

[CONVERSATION HISTORY]
${formatMessages(messages)}

[RESPONSE FORMAT]
You MUST respond with valid JSON only. No text before or after the JSON.
{
  "replyText": "Your message",
  "intent": "EDIT_REQUEST" | "QUESTION" | "CANCEL_SIGNAL" | "POSITIVE_FEEDBACK" | "BILLING" | "GENERAL",
  "editRequest": { "description": "...", "complexity": "simple|medium|complex" } or null,
  "escalate": true/false,
  "escalateReason": "reason" or null
}`
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
