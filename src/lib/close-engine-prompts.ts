/**
 * Close Engine Prompt Builder
 *
 * Pure functions that build system prompts for the AI Close Engine.
 * No DB calls, no side effects — takes context and returns prompt strings.
 */

import type { ConversationContext } from './close-engine'
import { getPricingConfig } from './pricing-config'
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

  PREVIEW_SENT: (ctx) => {
    const previewUrl = ctx.previewUrl || `Preview link pending`
    return `The site preview is ready to share. Send the preview link to the lead and ask what they think.
Preview URL: ${previewUrl}
If they say it looks good/they love it/they approve → prepare to send payment link (set nextStage to PAYMENT_SENT).
If they request changes → acknowledge, say "Got it, we'll update that and send you a new preview shortly", and set nextStage to EDIT_LOOP.
Distinguish between change requests ("change the headline", "different photo") and questions ("how long to go live?"). Answer questions directly.`
  },

  EDIT_LOOP: (ctx) => {
    const editRounds = ctx.conversation.editRounds || 0
    return `The lead wants changes. Collect their specific feedback. Acknowledge each request. Tell them you'll get it updated.
When they confirm the updated version looks good → set nextStage to PAYMENT_SENT.
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

  // Load custom scenario overrides from settings
  const templates = await getScenarioTemplates()
  const customOverride = templates?.scenarios?.[stage]
  const hasOverride = customOverride?.enabled && customOverride?.instructions_override?.trim()

  // Get stage-specific instructions (custom override takes priority)
  let stageInstructions: string
  if (hasOverride) {
    stageInstructions = customOverride!.instructions_override
  } else {
    const stageInstructionFn = STAGE_INSTRUCTIONS[stage]
    stageInstructions = stageInstructionFn
      ? stageInstructionFn(context)
      : `Unknown stage: ${stage}. Respond helpfully and set escalate: true.`
  }

  // Replace pricing placeholders in stage instructions
  stageInstructions = stageInstructions
    .replace(/\{\{siteBuildFee\}\}/g, `$${pricingConfig.siteBuildFee}`)
    .replace(/\{\{monthlyHosting\}\}/g, `$${pricingConfig.monthlyHosting}`)

  // Load AI learning context from conversation outcomes
  let learningContext = ''
  try {
    const { getLearningContext } = await import('./conversation-outcomes')
    const ctx = await getLearningContext(lead.industry || 'GENERAL', stage)
    if (ctx) learningContext = `\n${ctx}\n`
  } catch { /* learning system not critical */ }

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

[SMS FORMATTING RULES]
- Never use dashes, bullet points, numbered lists, or colons in texts.
- Never use em-dashes (\u2014) or semicolons.
- Max 2 sentences per text. Keep it SHORT.
- Write like you're texting a friend who owns a business, not writing an email.
- Use their first name, not their company name.
- Never start with "Hi there!" or "Hey there!" or "Hello!"
- Never say "I'd be happy to" or "I'd love to" or "absolutely."
- Don't use exclamation marks more than once per message.
- If they ask a question, answer it directly.

[iMESSAGE REACTIONS]
Messages prefixed with [REACTION:] are iMessage tapback reactions, not typed text.
- Like/Love on a question you asked = "Yes". Move forward. Do NOT say "was that a yes?"
- Dislike = they disagree or are unhappy. Respond with empathy.
- Question mark = they're confused. Clarify simply.
- Emphasize = they're highlighting importance. Brief acknowledgment.
- Love on a statement = they're excited. One short positive sentence max. Don't over-respond.
- Keep reaction responses extra short (1 sentence). The lead tapped a button, not typed a message.

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
${learningContext}
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

export async function getFirstMessageTemplate(
  entryPoint: string,
  lead: { firstName: string; companyName: string }
): Promise<string> {
  // Check for custom first message templates from settings
  const templates = await getScenarioTemplates()
  const customTemplate = templates?.firstMessages?.[entryPoint]

  const template = (customTemplate?.trim())
    ? customTemplate
    : (FIRST_MESSAGE_TEMPLATES[entryPoint] || FIRST_MESSAGE_TEMPLATES.SMS_REPLY)

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
// getScenarioTemplates() — load custom overrides from settings
// ============================================

let scenarioCache: { data: any; ts: number } | null = null
const SCENARIO_CACHE_TTL = 60_000 // 1 minute

async function getScenarioTemplates(): Promise<{ scenarios: Record<string, { instructions_override: string; enabled: boolean }>; firstMessages: Record<string, string> } | null> {
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
