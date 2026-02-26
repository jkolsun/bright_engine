/**
 * AI Session Analysis
 * Generates post-session recommendations using Claude Haiku 4.5.
 */

import { prisma } from './db'
import { getAnthropicClient, calculateApiCost } from './anthropic'

export async function generateSessionAnalysis(sessionId: string): Promise<void> {
  const session = await prisma.dialerSessionNew.findUnique({
    where: { id: sessionId },
    include: { rep: { select: { name: true } } },
  })

  if (!session) {
    console.warn(`[SessionAnalysis] Session ${sessionId} not found`)
    return
  }

  // Idempotent — skip if already analyzed
  if (session.aiRecommendation) {
    console.log(`[SessionAnalysis] Session ${sessionId} already has AI recommendation, skipping`)
    return
  }

  // Fetch call records for derived metrics
  const calls = await prisma.dialerCall.findMany({
    where: { sessionId },
    select: { dispositionResult: true, duration: true, previewSentDuringCall: true, connectedAt: true },
  })

  // Calculate derived metrics
  const connectedCalls = calls.filter(c => c.connectedAt).length
  const conversations = session.notInterestedCount + session.callbackCount +
    session.wantsToMoveForwardCount + session.interestedVerbalCount +
    session.wantsChangesCount + session.willLookLaterCount + session.dncCount

  const connectRate = session.totalCalls > 0
    ? ((connectedCalls / session.totalCalls) * 100).toFixed(1)
    : '0.0'
  const conversionRate = conversations > 0
    ? ((session.wantsToMoveForwardCount / conversations) * 100).toFixed(1)
    : '0.0'
  const previewSendRate = conversations > 0
    ? ((session.previewsSent / conversations) * 100).toFixed(1)
    : '0.0'

  const connectedDurations = calls
    .filter(c => c.connectedAt && c.duration && c.duration > 0)
    .map(c => c.duration!)
  const avgConnectedDuration = connectedDurations.length > 0
    ? Math.round(connectedDurations.reduce((s, d) => s + d, 0) / connectedDurations.length)
    : 0

  const vmRate = session.totalCalls > 0
    ? ((session.voicemails / session.totalCalls) * 100).toFixed(1)
    : '0.0'

  const durationMs = session.endedAt && session.startedAt
    ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
    : 0
  const durationMinutes = Math.round(durationMs / 60000)
  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  const userMessage = `Session Stats:
- Rep: ${session.rep?.name || 'Unknown'}
- Session Name: ${session.name || 'Unnamed'}
- Duration: ${durationStr}
- Total Dials: ${session.totalCalls}
- Conversations: ${conversations}
- Connect Rate: ${connectRate}%

Disposition Breakdown:
- Move Forward: ${session.wantsToMoveForwardCount}
- Callback: ${session.callbackCount}
- Interested Verbal: ${session.interestedVerbalCount}
- Wants Changes: ${session.wantsChangesCount}
- Will Look Later: ${session.willLookLaterCount}
- Not Interested: ${session.notInterestedCount}
- DNC: ${session.dncCount}
- Wrong Number: ${session.wrongNumberCount}
- Disconnected: ${session.disconnectedCount}
- Voicemail: ${session.voicemails}
- No Answer: ${session.noAnswers}

Preview Metrics:
- Previews Sent: ${session.previewsSent} (${previewSendRate}% of conversations)
- Previews Opened: ${session.previewsOpened}
- CTA Clicks: ${session.ctaClicks}

Conversion: ${session.wantsToMoveForwardCount} move forward out of ${conversations} conversations (${conversionRate}%)
Avg Connected Call Duration: ${avgConnectedDuration}s
VM Rate: ${vmRate}%`

  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: 'You are a sales performance analyst for a phone sales team selling websites to local service businesses. Analyze the dialer session stats and provide a brief, actionable recommendation. Be direct and specific. Focus on what the rep can do differently next session to improve results. Keep it to 3-4 sentences max.',
      messages: [{ role: 'user', content: userMessage }],
    })

    const aiText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    await prisma.dialerSessionNew.update({
      where: { id: sessionId },
      data: { aiRecommendation: aiText },
    })

    // Log API cost
    const cost = calculateApiCost(response.usage, 0.001, 'haiku')
    console.log(`[SessionAnalysis] Generated recommendation for session ${sessionId} (cost: $${cost.toFixed(4)})`)
  } catch (err) {
    console.error(`[SessionAnalysis] AI generation failed for session ${sessionId}:`, err)
  }
}
