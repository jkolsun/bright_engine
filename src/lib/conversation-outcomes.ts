/**
 * Conversation Outcomes — AI Learning System
 *
 * Tracks what worked and what didn't in Close Engine conversations.
 * Queries outcome data to inject learning context into AI prompts.
 */

import { prisma } from './db'

// ============================================
// logConversationOutcome()
// ============================================

export async function logConversationOutcome(
  leadId: string,
  finalStage: 'PAID' | 'STALLED' | 'LOST'
): Promise<void> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      industry: true,
      closeConversation: {
        select: { id: true, stage: true, entryPoint: true, createdAt: true },
      },
    },
  })
  if (!lead || !lead.closeConversation) return

  const conversation = lead.closeConversation

  // Load all messages for this lead
  const messages = await prisma.message.findMany({
    where: { leadId },
    orderBy: { createdAt: 'asc' },
    select: {
      direction: true,
      content: true,
      createdAt: true,
    },
  })

  const totalMessages = messages.length
  if (totalMessages === 0) return

  // Count messages per stage (approximate based on stage transitions)
  const events = await prisma.leadEvent.findMany({
    where: { leadId, eventType: 'STAGE_CHANGE' },
    orderBy: { createdAt: 'asc' },
    select: { toStage: true, createdAt: true },
  })

  const messagesPerStage: Record<string, number> = {}
  let currentStage = 'INITIATED'
  let stageStartIdx = 0

  for (const event of events) {
    if (event.toStage) {
      // Count messages between stage transitions
      const stageEnd = messages.findIndex(
        (m, i) => i >= stageStartIdx && m.createdAt >= event.createdAt
      )
      if (stageEnd > stageStartIdx) {
        messagesPerStage[currentStage] = (messagesPerStage[currentStage] || 0) + (stageEnd - stageStartIdx)
      }
      currentStage = event.toStage
      stageStartIdx = stageEnd >= 0 ? stageEnd : stageStartIdx
    }
  }
  // Count remaining messages in current stage
  messagesPerStage[currentStage] = (messagesPerStage[currentStage] || 0) + (totalMessages - stageStartIdx)

  // Time to convert (minutes from first message to last)
  const firstMsg = messages[0]
  const lastMsg = messages[messages.length - 1]
  const timeToConvert = finalStage === 'PAID'
    ? Math.round((lastMsg.createdAt.getTime() - firstMsg.createdAt.getTime()) / 60000)
    : null

  // Find the last outbound message and last inbound message
  const lastOutbound = [...messages].reverse().find(m => m.direction === 'OUTBOUND')
  const lastInbound = [...messages].reverse().find(m => m.direction === 'INBOUND')

  // Stalled info
  const stalledAtStage = finalStage === 'STALLED' ? conversation.stage : null
  const stalledAfterMessage = finalStage === 'STALLED' ? (lastOutbound?.content || null) : null

  // Effective patterns: AI messages that got quick responses (under 5 min)
  const effectivePatterns: Array<{ stage: string; aiMessage: string; leadResponse: string; responseTimeSeconds: number }> = []
  const ineffectivePatterns: Array<{ stage: string; aiMessage: string; silenceHours: number }> = []

  for (let i = 0; i < messages.length - 1; i++) {
    const msg = messages[i]
    const nextMsg = messages[i + 1]

    if (msg.direction === 'OUTBOUND' && nextMsg.direction === 'INBOUND') {
      const responseTime = (nextMsg.createdAt.getTime() - msg.createdAt.getTime()) / 1000
      if (responseTime < 300) { // Under 5 minutes = effective
        effectivePatterns.push({
          stage: currentStage,
          aiMessage: msg.content.substring(0, 200),
          leadResponse: nextMsg.content.substring(0, 200),
          responseTimeSeconds: Math.round(responseTime),
        })
      }
    }

    // AI message followed by 24+ hours of silence (or end of conversation)
    if (msg.direction === 'OUTBOUND') {
      const nextInbound = messages.slice(i + 1).find(m => m.direction === 'INBOUND')
      if (!nextInbound) {
        const silenceHours = (Date.now() - msg.createdAt.getTime()) / (1000 * 60 * 60)
        if (silenceHours > 24) {
          ineffectivePatterns.push({
            stage: currentStage,
            aiMessage: msg.content.substring(0, 200),
            silenceHours: Math.round(silenceHours),
          })
        }
      }
    }
  }

  // Detect objection type from lead messages
  const allInbound = messages.filter(m => m.direction === 'INBOUND').map(m => m.content.toLowerCase())
  const objectionType = detectObjection(allInbound)

  // Check if lead was reactivated (went silent then came back)
  const reactivated = detectReactivation(messages)

  await prisma.conversationOutcome.create({
    data: {
      leadId,
      finalStage,
      totalMessages,
      messagesPerStage,
      timeToConvert,
      stalledAtStage,
      stalledAfterMessage,
      lastLeadMessage: lastInbound?.content?.substring(0, 500) || null,
      effectivePatterns: effectivePatterns.slice(0, 10),
      ineffectivePatterns: ineffectivePatterns.slice(0, 10),
      industry: lead.industry || 'GENERAL',
      objectionType,
      objectionResolved: objectionType
        ? (finalStage === 'PAID' ? 'overcame' : finalStage === 'STALLED' ? 'deferred' : 'lost')
        : null,
      reactivated,
    },
  })
}

// ============================================
// getLearningContext() — inject into AI prompt
// ============================================

export async function getLearningContext(
  industry: string,
  stage: string
): Promise<string | null> {
  // Query recent outcomes for similar leads
  const outcomes = await prisma.conversationOutcome.findMany({
    where: {
      industry: { contains: industry.split('_')[0], mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  if (outcomes.length < 5) return null // Not enough data yet

  const paid = outcomes.filter(o => o.finalStage === 'PAID')
  const stalled = outcomes.filter(o => o.finalStage === 'STALLED')
  const lost = outcomes.filter(o => o.finalStage === 'LOST')

  const conversionRate = Math.round((paid.length / outcomes.length) * 100)

  // Find most common stall stage
  const stallStages: Record<string, number> = {}
  for (const o of stalled) {
    if (o.stalledAtStage) {
      stallStages[o.stalledAtStage] = (stallStages[o.stalledAtStage] || 0) + 1
    }
  }
  const topStallStage = Object.entries(stallStages).sort((a, b) => b[1] - a[1])[0]

  // Avg messages per stage for current stage
  let avgMsgsForStage = 0
  let stageCount = 0
  for (const o of paid) {
    const perStage = o.messagesPerStage as Record<string, number> | null
    if (perStage && perStage[stage]) {
      avgMsgsForStage += perStage[stage]
      stageCount++
    }
  }
  if (stageCount > 0) avgMsgsForStage = Math.round(avgMsgsForStage / stageCount)

  // Effective patterns for this stage
  const stageEffective: string[] = []
  for (const o of paid) {
    const patterns = o.effectivePatterns as Array<{ stage: string; aiMessage: string }> | null
    if (patterns) {
      for (const p of patterns) {
        if (p.stage === stage && stageEffective.length < 3) {
          stageEffective.push(p.aiMessage)
        }
      }
    }
  }

  // Objection frequency
  const objectionCounts: Record<string, number> = {}
  for (const o of outcomes) {
    if (o.objectionType) {
      objectionCounts[o.objectionType] = (objectionCounts[o.objectionType] || 0) + 1
    }
  }

  // Build the context string
  let context = `[AI LEARNING — ${industry.replace(/_/g, ' ')} leads]\n`
  context += `Based on ${outcomes.length} recent conversations: ${conversionRate}% conversion rate.\n`

  if (topStallStage) {
    context += `Most common drop-off: ${topStallStage[0]} stage (${topStallStage[1]} leads).\n`
  }

  if (avgMsgsForStage > 0) {
    context += `Successful conversions avg ${avgMsgsForStage} messages at the ${stage} stage.\n`
  }

  if (stageEffective.length > 0) {
    context += `Messages that worked well at this stage: "${stageEffective[0]}"\n`
  }

  const topObjection = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1])[0]
  if (topObjection) {
    const resolved = outcomes.filter(o => o.objectionType === topObjection[0] && o.objectionResolved === 'overcame').length
    context += `Most common objection: ${topObjection[0]} (${topObjection[1]}x, ${resolved} overcame).\n`
  }

  // Avg time to convert
  const convertTimes = paid.filter(o => o.timeToConvert).map(o => o.timeToConvert!)
  if (convertTimes.length > 0) {
    const avgHours = Math.round(convertTimes.reduce((a, b) => a + b, 0) / convertTimes.length / 60)
    context += `Avg time to convert: ${avgHours} hours.\n`
  }

  return context
}

// ============================================
// getOutcomeStats() — for learning dashboard
// ============================================

export async function getOutcomeStats(): Promise<{
  totalOutcomes: number
  conversionRate: number
  byStage: Record<string, { total: number; converted: number }>
  byIndustry: Record<string, { total: number; converted: number }>
  topObjections: Array<{ type: string; count: number; resolvedCount: number }>
  avgTimeToConvert: number
}> {
  const outcomes = await prisma.conversationOutcome.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  const totalOutcomes = outcomes.length
  const paid = outcomes.filter(o => o.finalStage === 'PAID')
  const conversionRate = totalOutcomes > 0 ? Math.round((paid.length / totalOutcomes) * 100) : 0

  // By stage (where leads stall)
  const byStage: Record<string, { total: number; converted: number }> = {}
  for (const o of outcomes) {
    const stage = o.stalledAtStage || o.finalStage
    if (!byStage[stage]) byStage[stage] = { total: 0, converted: 0 }
    byStage[stage].total++
    if (o.finalStage === 'PAID') byStage[stage].converted++
  }

  // By industry
  const byIndustry: Record<string, { total: number; converted: number }> = {}
  for (const o of outcomes) {
    if (!byIndustry[o.industry]) byIndustry[o.industry] = { total: 0, converted: 0 }
    byIndustry[o.industry].total++
    if (o.finalStage === 'PAID') byIndustry[o.industry].converted++
  }

  // Top objections
  const objectionMap: Record<string, { count: number; resolved: number }> = {}
  for (const o of outcomes) {
    if (o.objectionType) {
      if (!objectionMap[o.objectionType]) objectionMap[o.objectionType] = { count: 0, resolved: 0 }
      objectionMap[o.objectionType].count++
      if (o.objectionResolved === 'overcame') objectionMap[o.objectionType].resolved++
    }
  }
  const topObjections = Object.entries(objectionMap)
    .map(([type, data]) => ({ type, count: data.count, resolvedCount: data.resolved }))
    .sort((a, b) => b.count - a.count)

  // Avg time to convert
  const times = paid.filter(o => o.timeToConvert).map(o => o.timeToConvert!)
  const avgTimeToConvert = times.length > 0
    ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    : 0

  return { totalOutcomes, conversionRate, byStage, byIndustry, topObjections, avgTimeToConvert }
}

// ============================================
// Helper functions
// ============================================

function detectObjection(inboundMessages: string[]): string | null {
  const text = inboundMessages.join(' ')

  if (/too (much|expensive|pricey)|can't afford|budget|cheaper|cost too|how much/.test(text)) return 'price'
  if (/not (right )?now|later|next (week|month)|think about|need time/.test(text)) return 'timing'
  if (/scam|trust|legit|real|reliable|guarantee/.test(text)) return 'trust'
  if (/partner|wife|husband|boss|check with|ask my/.test(text)) return 'partner'
  if (/already have|someone else|another (company|service)|competition/.test(text)) return 'competition'

  return null
}

function detectReactivation(messages: Array<{ direction: string; createdAt: Date }>): boolean {
  // Check if there was a gap of 48+ hours between inbound messages
  const inbound = messages.filter(m => m.direction === 'INBOUND')
  for (let i = 1; i < inbound.length; i++) {
    const gap = inbound[i].createdAt.getTime() - inbound[i - 1].createdAt.getTime()
    if (gap > 48 * 60 * 60 * 1000) return true
  }
  return false
}
