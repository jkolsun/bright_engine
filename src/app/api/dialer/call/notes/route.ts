export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || !['ADMIN', 'REP'].includes(session.role)) {
    return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // Support fetching a specific call's notes (for recent lead pre-load)
  const callId = searchParams.get('callId')
  if (callId) {
    const call = await prisma.dialerCall.findUnique({
      where: { id: callId },
      select: { notes: true },
    })
    return NextResponse.json({ callNotes: call?.notes || '' })
  }

  const leadId = searchParams.get('leadId')
  if (!leadId) return NextResponse.json({ notes: [] })

  // Get notes from previous calls to this lead
  const calls = await prisma.dialerCall.findMany({
    where: { leadId, notes: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: 10,
    select: { notes: true, startedAt: true, rep: { select: { name: true } } },
  })

  // Get REP_NOTE events from LeadEvent (note text is in metadata.text)
  const events = await prisma.leadEvent.findMany({
    where: { leadId, eventType: 'REP_NOTE' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { metadata: true, createdAt: true, actor: true },
  })

  const notes = [
    ...calls.filter(c => c.notes).map(c => ({
      text: c.notes!,
      date: new Date(c.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actor: c.rep?.name || undefined,
    })),
    ...events.map(e => ({
      text: (e.metadata as any)?.text || (e.metadata as any)?.notes || '',
      date: new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actor: e.actor?.replace('rep:', '') || undefined,
    })).filter(n => n.text),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)

  return NextResponse.json({ notes })
}
