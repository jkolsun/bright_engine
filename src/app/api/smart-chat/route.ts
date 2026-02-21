import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { DEFAULT_SMART_CHAT } from '@/lib/message-batcher'

export const dynamic = 'force-dynamic'

// GET /api/smart-chat - Get SmartChat settings
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const setting = await prisma.settings.findUnique({
      where: { key: 'smart_chat' },
    })

    return NextResponse.json({
      settings: setting?.value ?? DEFAULT_SMART_CHAT,
    })
  } catch (error) {
    console.error('Error fetching SmartChat settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// POST /api/smart-chat - Save SmartChat settings
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    // Validate
    const settings = {
      batchWindowMs: typeof data.batchWindowMs === 'number' ? Math.max(0, Math.min(30000, data.batchWindowMs)) : DEFAULT_SMART_CHAT.batchWindowMs,
      conversationEnderEnabled: typeof data.conversationEnderEnabled === 'boolean' ? data.conversationEnderEnabled : DEFAULT_SMART_CHAT.conversationEnderEnabled,
      qualifyingQuestionCount: typeof data.qualifyingQuestionCount === 'number' ? Math.max(1, Math.min(5, data.qualifyingQuestionCount)) : DEFAULT_SMART_CHAT.qualifyingQuestionCount,
    }

    const result = await prisma.settings.upsert({
      where: { key: 'smart_chat' },
      update: { value: settings },
      create: { key: 'smart_chat', value: settings },
    })

    return NextResponse.json({ settings: result.value })
  } catch (error) {
    console.error('Error saving SmartChat settings:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
