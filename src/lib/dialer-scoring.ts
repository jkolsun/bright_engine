import { prisma } from './db'

// ============================================
// AI OUTCOME-BASED SCORING (No Transcription)
// Scores reps weekly on RESULTS not recordings
// ============================================

interface ScoringResult {
  connectToInterest: number    // /15
  interestToClose: number      // /15
  previewSendRate: number      // /5
  previewToOpenRate: number    // /5
  openToCloseRate: number      // /5
  callDuration: number         // /5
  callbackShowRate: number     // /5
  dncRate: number              // /5
  volumeConsistency: number    // /5
  totalScore: number           // /60 (15+15+5+5+5+5+5+5+5)
  coachingNotes: string[]
}

/**
 * Calculate weekly scoring for a rep
 */
export async function calculateWeeklyScore(repId: string, weekStart?: Date): Promise<ScoringResult> {
  const start = weekStart || getMonday(new Date())
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get calls from DialerCall table
  const calls = await prisma.dialerCall.findMany({
    where: {
      repId,
      startedAt: { gte: start, lt: end },
      status: { in: ['COMPLETED', 'CONNECTED'] },
    },
  })

  // Also check Activity table (always exists)
  const activities = await prisma.activity.findMany({
    where: { repId, activityType: 'CALL', createdAt: { gte: start, lt: end } },
  })

  // Get daily rep activity for volume tracking
  const dailyStats = await prisma.repActivity.findMany({
    where: { repId, date: { gte: start, lt: end } },
  })

  // --- Calculate each metric ---

  // 1. Connect-to-Interest Rate (/15)
  const totalConversations = calls.filter(c =>
    ['interested', 'not_interested', 'callback'].includes(c.dispositionResult || '')
  ).length + activities.filter(a =>
    ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'CONNECTED'].includes(a.callDisposition || '')
  ).length

  const interested = calls.filter(c => c.dispositionResult === 'interested').length +
    activities.filter(a => a.callDisposition === 'INTERESTED').length

  const connectToInterestRate = totalConversations > 0 ? interested / totalConversations : 0
  const connectToInterest = Math.min(15, Math.round(connectToInterestRate * 30)) // 50% = 15 pts

  // 2. Interest-to-Close Rate (/15) — check if interested leads became clients
  const interestedLeadIds = [
    ...calls.filter(c => c.dispositionResult === 'interested').map(c => c.leadId),
    ...activities.filter(a => a.callDisposition === 'INTERESTED').map(a => a.leadId),
  ]

  let interestToCloseRate = 0
  let interestToClose = 0
  if (interestedLeadIds.length > 0) {
    const closedClients = await prisma.client.count({
      where: { leadId: { in: interestedLeadIds } },
    })
    interestToCloseRate = closedClients / interestedLeadIds.length
    interestToClose = Math.min(15, Math.round(interestToCloseRate * 30))
  }

  // 3. Preview Send Rate (/5) — % of conversations where rep sent preview (target 90%+)
  const totalDials = calls.length + activities.length
  const previewsSent = dailyStats.reduce((sum, d) => sum + d.previewLinksSent, 0)
  const previewSendRate = totalConversations > 0 ? previewsSent / totalConversations : 0
  const previewSendScore = Math.min(5, Math.round(previewSendRate * 5 / 0.9)) // 90% = 5 pts

  // 3b. Preview-to-Open Rate (/5) — % of sent previews that got opened
  const previewsOpened = dailyStats.reduce((sum, d) => sum + ((d as any).previewsOpened || 0), 0)
  const previewToOpenRate = previewsSent > 0 ? previewsOpened / previewsSent : 0
  const previewToOpenScore = Math.min(5, Math.round(previewToOpenRate * 5 / 0.5)) // 50% = 5 pts

  // 3c. Open-to-Close Rate (/5) — % of opened previews that resulted in payment
  const paymentsClosed = dailyStats.reduce((sum, d) => sum + ((d as any).paymentsClosed || 0), 0)
  const openToCloseRate = previewsOpened > 0 ? paymentsClosed / previewsOpened : 0
  const openToCloseScore = Math.min(5, Math.round(openToCloseRate * 5 / 0.3)) // 30% = 5 pts

  // 4. Call Duration Sweet Spot (/5) — 2-4 min ideal
  const durations = [
    ...calls.filter(c => c.duration).map(c => c.duration!),
    ...activities.filter(a => a.durationSeconds).map(a => a.durationSeconds!),
  ]
  let durationScore = 0
  if (durations.length > 0) {
    const avgDur = durations.reduce((a, b) => a + b, 0) / durations.length
    if (avgDur >= 120 && avgDur <= 240) durationScore = 5
    else if (avgDur >= 90 && avgDur <= 300) durationScore = 3
    else if (avgDur >= 60) durationScore = 1
  }

  // 5. Callback Show Rate (/5)
  const callbackCalls = calls.filter(c => c.dispositionResult === 'callback')
  let callbackShowRate = 0
  let callbackShowScore = 3 // Neutral default
  if (callbackCalls.length > 0) {
    const callbackLeadIds = callbackCalls.map(c => c.leadId)
    const followUps = await prisma.dialerCall.count({
      where: {
        leadId: { in: callbackLeadIds },
        repId,
        startedAt: { gt: start },
        dispositionResult: { in: ['interested', 'not_interested', 'callback'] },
      },
    })
    callbackShowRate = followUps / callbackCalls.length
    callbackShowScore = Math.min(5, Math.round(callbackShowRate * 5))
  }

  // 6. DNC Rate (/5 — lower is better)
  const dncCount = calls.filter(c => c.dispositionResult === 'dnc').length
  const dncRate = totalDials > 0 ? dncCount / totalDials : 0
  const dncScore = dncRate === 0 ? 5 : dncRate < 0.02 ? 4 : dncRate < 0.05 ? 3 : dncRate < 0.1 ? 1 : 0

  // 7. Volume Consistency (/5)
  const targetDialsPerDay = 200
  const activeDays = dailyStats.filter(d => d.dials > 0).length
  const avgDialsPerDay = activeDays > 0 ? dailyStats.reduce((sum, d) => sum + d.dials, 0) / activeDays : 0
  const volumeScore = activeDays >= 5 && avgDialsPerDay >= targetDialsPerDay * 0.8 ? 5 :
                      activeDays >= 4 && avgDialsPerDay >= targetDialsPerDay * 0.6 ? 4 :
                      activeDays >= 3 && avgDialsPerDay >= targetDialsPerDay * 0.4 ? 3 :
                      activeDays >= 2 ? 2 : activeDays >= 1 ? 1 : 0

  // Total
  const totalScore = connectToInterest + interestToClose + previewSendScore + previewToOpenScore + openToCloseScore + durationScore + callbackShowScore + dncScore + volumeScore

  // Generate coaching notes
  const coachingNotes: string[] = []
  if (connectToInterestRate < 0.2 && totalConversations > 5) {
    coachingNotes.push('Low connect-to-interest rate. Pitch isn\'t landing — lead with competitor comparison.')
  }
  if (interestToCloseRate < 0.3 && interested > 3) {
    coachingNotes.push('High interest but low close rate. Text the preview every time. Ask "want me to make it live?"')
  }
  if (previewSendRate < 0.8 && totalConversations > 5) {
    coachingNotes.push('You\'re not sending the preview on every call. The preview IS the pitch — send it in the first 30 seconds, every time.')
  }
  if (previewSendRate >= 0.8 && previewToOpenRate < 0.5 && previewsSent > 5) {
    coachingNotes.push('Leads aren\'t opening your preview. Make sure you say "pull it up on your phone right now — I\'ll wait." Don\'t just text and move on.')
  }
  if (previewToOpenRate >= 0.5 && openToCloseRate < 0.2 && previewsOpened > 3) {
    coachingNotes.push('They\'re looking at the preview but not buying. Walk them through it live. Point out specific features. Then ask: "Want me to make it live for you?"')
  }
  if (openToCloseRate >= 0.3 && previewSendRate >= 0.8) {
    coachingNotes.push('You\'re crushing it. High preview send rate AND strong close rate. Keep this exact flow going.')
  }
  if (durations.length > 5) {
    const avgDur = durations.reduce((a, b) => a + b, 0) / durations.length
    if (avgDur < 60) {
      coachingNotes.push(`Calls averaging ${Math.round(avgDur)} seconds. Not getting past the opener. Slow down.`)
    }
  }
  if (dncRate > 0.05 && totalDials > 20) {
    coachingNotes.push('High DNC rate. Soften the opener. Ask permission first.')
  }
  if (activeDays < 3) {
    coachingNotes.push('Low activity days. Consistency wins — aim for 5 days per week.')
  }
  if (coachingNotes.length === 0 && totalScore >= 45) {
    coachingNotes.push('Great week! Keep up the momentum. You\'re in the top tier.')
  }

  // Save to CallScoring table
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
  try {
    await prisma.callScoring.upsert({
      where: { repId_weekStart: { repId, weekStart: start } },
      create: {
        repId, weekStart: start,
        connectToInterest: connectToInterestRate, interestToClose: interestToCloseRate,
        previewSendRate, previewToOpenRate, openToCloseRate,
        avgDuration, callbackShowRate, dncRate, volumeScore, totalScore,
        coachingNotes: coachingNotes.join('\n'),
      },
      update: {
        connectToInterest: connectToInterestRate, interestToClose: interestToCloseRate,
        previewSendRate, previewToOpenRate, openToCloseRate,
        avgDuration, callbackShowRate, dncRate, volumeScore, totalScore,
        coachingNotes: coachingNotes.join('\n'),
      },
    })
  } catch (err) {
    console.error('[Scoring] Failed to save CallScoring:', err)
  }

  return {
    connectToInterest, interestToClose,
    previewSendRate: previewSendScore, previewToOpenRate: previewToOpenScore, openToCloseRate: openToCloseScore,
    callDuration: durationScore, callbackShowRate: callbackShowScore,
    dncRate: dncScore, volumeConsistency: volumeScore, totalScore, coachingNotes,
  }
}

/**
 * Get the most recent coaching tip for a rep
 */
export async function getCoachingTip(repId: string): Promise<string | null> {
  try {
    const latestScoring = await prisma.callScoring.findFirst({
      where: { repId },
      orderBy: { weekStart: 'desc' },
    })
    if (latestScoring?.coachingNotes) {
      const notes = latestScoring.coachingNotes.split('\n').filter(Boolean)
      return notes[0] || null
    }
  } catch (err) {
    console.error('[Scoring] Failed to fetch coaching tip:', err)
  }

  // Fallback: generate a tip based on today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const stats = await prisma.repActivity.findUnique({
    where: { repId_date: { repId, date: today } },
  })

  if (!stats) return 'Start dialing! The first call is always the hardest.'

  if (stats.conversations > 0 && stats.previewLinksSent === 0) {
    return 'You\'ve had conversations but haven\'t sent any previews. Reps who text the preview close 3x more!'
  }

  if (stats.dials > 20 && stats.conversations === 0) {
    return 'Lots of dials but no connects. Try different times — early morning and late afternoon work best.'
  }

  if (stats.closes > 0) {
    return `Great job — ${stats.closes} close${stats.closes > 1 ? 's' : ''} today! Keep the momentum going.`
  }

  return null
}

/**
 * Get rep stats for a time period
 */
export async function getRepStats(repId: string, period: 'today' | 'week' | 'month' | 'all') {
  const now = new Date()
  let startDate: Date

  switch (period) {
    case 'today':
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      startDate = getMonday(now)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'all':
      startDate = new Date(2020, 0, 1)
      break
  }

  const dailyStats = await prisma.repActivity.findMany({
    where: { repId, date: { gte: startDate } },
  })

  const commissions = await prisma.commission.findMany({
    where: { repId, createdAt: { gte: startDate }, status: { not: 'REJECTED' } },
  })

  return {
    dials: dailyStats.reduce((sum, d) => sum + d.dials, 0),
    conversations: dailyStats.reduce((sum, d) => sum + d.conversations, 0),
    previewsSent: dailyStats.reduce((sum, d) => sum + d.previewLinksSent, 0),
    previewsOpened: dailyStats.reduce((sum, d) => sum + ((d as any).previewsOpened || 0), 0),
    paymentLinksSent: dailyStats.reduce((sum, d) => sum + ((d as any).paymentLinksSent || 0), 0),
    paymentsClosed: dailyStats.reduce((sum, d) => sum + ((d as any).paymentsClosed || 0), 0),
    closes: dailyStats.reduce((sum, d) => sum + d.closes, 0),
    commissionEarned: commissions.reduce((sum, c) => sum + c.amount, 0),
    activeDays: dailyStats.filter(d => d.dials > 0).length,
  }
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
