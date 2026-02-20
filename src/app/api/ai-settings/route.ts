import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

const DEFAULT_AI_SETTINGS = {
  globalAiAutoRespond: true,
  preClientAi: true,
  postClientAi: true,
  responseDelay: { min: 30, max: 90 },
  tone: 'casual',
  maxResponseLength: 2,
  useEmojis: 'sparingly',
  humanizingPrompt: `You are a team member at Bright Automations. You text like a real person — short messages, casual, no corporate speak. Keep it natural. Use the client's first name. If you're not sure about something, say "let me check on that and get back to you" and escalate.

SMS FORMATTING RULES:
- Never use dashes, bullet points, numbered lists, or colons in texts.
- Never use em-dashes or semicolons.
- Max 2 sentences per text. Keep it SHORT.
- Write like you're texting a friend who owns a business, not writing an email.
- Use their first name, not their company name.
- Never start with "Hi there!" or "Hey there!" or "Hello!"
- Never say "I'd be happy to" or "I'd love to" or "absolutely."
- Don't use exclamation marks more than once per message.
- If they ask a question, answer it directly.

For pre-client (sales) conversations, follow the preview-first flow:
1. Your first goal is always to get them to look at their preview website.
2. Within your first 2 messages, send the preview: "I actually already put together a site for {{companyName}} — check it out: {{preview_url}}"
3. Wait for them to view it (track via analytics).
4. Once viewed, ask what they think.
5. If positive, pitch pricing and send the payment link.
6. If they want changes, note it and confirm you'll update before go-live.
Never send the payment link before they've seen the preview.
Never pitch pricing before they've seen the preview.
The preview sells itself — let them see it first.`,
  escalationTriggers: [
    { id: 'upset', label: 'Client is upset / negative sentiment', enabled: true },
    { id: 'custom_package', label: 'Wants custom or bigger package', enabled: true },
    { id: 'cancel', label: 'Asks to cancel', enabled: true },
    { id: 'refund', label: 'Asks for refund', enabled: true },
    { id: 'competitor', label: 'Mentions a competitor', enabled: true },
    { id: 'speak_person', label: 'Asks to speak to a person / manager', enabled: true },
    { id: 'legal', label: 'Legal or threatening language', enabled: true },
    { id: 'cant_parse', label: "AI can't parse the request", enabled: true },
    { id: 'back_and_forth', label: '3+ back-and-forth without resolution', enabled: true, threshold: 3 },
    { id: 'payment_dispute', label: 'Payment dispute / billing question', enabled: true },
    { id: 'out_of_scope', label: 'Question outside your service scope', enabled: true },
    { id: 'high_volume', label: '10+ messages/day from one client', enabled: true, threshold: 10 },
  ],
  escalationMessage: "Let me get the right person on this for you. Someone will follow up shortly.",
}

// GET /api/ai-settings - Get AI handler settings
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const setting = await prisma.settings.findUnique({
      where: { key: 'ai_handler' }
    })

    const settings = setting ? setting.value : DEFAULT_AI_SETTINGS

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching AI settings:', error)
    return NextResponse.json({ error: 'Failed to fetch AI settings' }, { status: 500 })
  }
}

// POST /api/ai-settings - Save AI handler settings
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const setting = await prisma.settings.upsert({
      where: { key: 'ai_handler' },
      update: { value: data },
      create: { key: 'ai_handler', value: data },
    })

    return NextResponse.json({ settings: setting.value })
  } catch (error) {
    console.error('Error saving AI settings:', error)
    return NextResponse.json({ error: 'Failed to save AI settings' }, { status: 500 })
  }
}