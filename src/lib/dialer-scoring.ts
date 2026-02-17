import { prisma } from './db'

// ============================================
// AI OUTCOME-BASED SCORING (No Transcription)
// Scores reps weekly on RESULTS not recordings
// ============================================

interface ScoringResult {
  connectToInterest: number  // /15
  interestToClose: number    // /15
  previewTextRate: number    // /10
  callDuration: number       // /5
  callbackShowRate: number   // /5
  dncRate: number            // /5
  volumeConsistency: number  // /5
  totalScore: number         // /60
  coachingNotes: string[]
}

/**
 * Calculate weekly scoring for a rep
 */
export async function calculateWeeklyScore(repId: string, weekStart?: Date): Promise<ScoringResult> {
  const start = weekStart || getMonday(new Date())
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Get all calls for this rep in the week
  const calls = await prisma.call.findMany({
    where: {
      repId,
      createdAt: { gte: start, lt: end },
      status: 'completed',
    },
  })

  // Also check Activity table for legacy data
  const activities = await prisma.activity.findMany({
    where: {
      repId,
      activityType: 'CALL',
      createdAt: { gte: start, lt: end },
    },
  })

  // Get daily rep activity for volume tracking
  const dailyStats = await prisma.repActivity.findMany({
    where: {
      repId,
      date: { gte: start, lt: end },
    },
  })

  // --- Calculate each metric ---

  // 1. Connect-to-Interest Rate (/15)
  const totalConversations = calls.filter(c =>
    ['interested', 'not_interested', 'callback'].includes(c.outcome || '')
  ).length + activities.filter(a =>
    ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'CONNECTED'].includes(a.callDisposition || '')
  ).length

  const interested = calls.filter(c => c.outcome === 'interested').length +
    activities.filter(a => a.callDisposition === 'INTERESTED').length

  const connectToInterestRate = totalConversations > 0 ? interested / totalConversations : 0
  const connectToInterest = Math.min(15, Math.round(connectToInterestRate * 30)) // 50% = 15 pts

  // 2. Interest-to-Close Rate (/15) — check if interested leads became clients
  const interestedLeadIds = [
    ...calls.filter(c => c.outcome === 'interested').map(c => c.leadId),
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

  // 3. Preview Text Rate (/10)
  const totalDials = calls.length + activities.length
  const previewsSent = dailyStats.reduce((sum, d) => sum + d.previewLinksSent, 0)
  const previewTextRate = totalConversations > 0 ? previewsSent / totalConversations : 0
  const previewTextScore = Math.min(10, Math.round(previewTextRate * 10))

  // 4. Call Duration Sweet Spot (/5) — 2-4 min ideal
  const durations = [
    ...calls.filter(c => c.durationSeconds).map(c => c.durationSeconds!),
    ...activities.filter(a => a.durationSeconds).map(a => a.durationSeconds!),
  ]
  let durationScore = 0
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    if (avgDuration >= 120 && avgDuration <= 240) durationScore = 5  // 2-4 min = perfect
    else if (avgDuration >= 90 && avgDuration <= 300) durationScore = 3  // 1.5-5 min = good
    else if (avgDuration >= 60) durationScore = 1  // >1 min = okay
  }

  // 5. Callback Show Rate (/5)
  const callbackCalls = calls.filter(c => c.outcome === 'callback' && c.callbackDate)
  let callbackShowRate = 0
  let callbackShowScore = 0
  if (callbackCalls.length > 0) {
    // Check if callback leads were called back and answered
    const callbackLeadIds = callbackCalls.map(c => c.leadId)
    const followUps = await prisma.call.count({
      where: {
        leadId: { in: callbackLeadIds },
        repId,
        createdAt: { gt: start },
        outcome: { in: ['interested', 'not_interested', 'callback'] },
      },
    })
    callbackShowRate = followUps / callbackCalls.length
    callbackShowScore = Math.min(5, Math.round(callbackShowRate * 5))
  } else {
    callbackShowScore = 3 // Neutral if no callbacks
  }

  // 6. DNC Rate (/5 — lower is better)
  const dncCount = calls.filter(c => c.outcome === 'dnc').length
  const dncRate = totalDials > 0 ? dncCount / totalDials : 0
  const dncScore = dncRate === 0 ? 5 : dncRate < 0.02 ? 4 : dncRate < 0.05 ? 3 : dncRate < 0.1 ? 1 : 0

  // 7. Volume Consistency (/5) — hitting daily targets
  const targetDialsPerDay = 200
  const activeDays = dailyStats.filter(d => d.dials > 0).length
  const avgDialsPerDay = activeDays > 0 ? dailyStats.reduce((sum, d) => sum + d.dials, 0) / activeDays : 0
  const volumeScore = activeDays >= 5 && avgDialsPerDay >= targetDialsPerDay * 0.8 ? 5 :
                      activeDays >= 4 && avgDialsPerDay >= targetDialsPerDay * 0.6 ? 4 :
                      activeDays >= 3 && avgDialsPerDay >= targetDialsPerDay * 0.4 ? 3 :
                      activeDays >= 2 ? 2 : activeDays >= 1 ? 1 : 0

  // Total
  const totalScore = connectToInterest + interestToClose + previewTextScore + durationScore + callbackShowScore + dncScore + volumeScore

  // Generate coaching notes
  const coachingNotes: string[] = []

  if (connectToInterestRate < 0.2 && totalConversations > 5) {
    coachingNotes.push('Low connect-to-interest rate. Pitch isn\'t landing — lead with competitor comparison.')
  }
  if (interestToCloseRate < 0.3 && interested > 3) {
    coachingNotes.push('High interest but low close rate. Text the preview every time. Ask "want me to make it live?"')
  }
  if (previewTextRate < 0.5 && totalConversations > 5) {
    coachingNotes.push('Low preview text rate. Reps who text the preview close 3x more. Do it every call.')
  }
  if (durations.length > 5) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
    if (avgDuration < 60) {
      coachingNotes.push(`Calls averaging ${Math.round(avgDuration)} seconds. Not getting past the opener. Slow down.`)
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

  // Save to database
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0

  await prisma.callScoring.upsert({
    where: { repId_weekStart: { repId, weekStart: start } },
    create: {
      repId,
      weekStart: start,
      connectToInterest: connectToInterestRate,
      interestToClose: interestToCloseRate,
      previewTextRate,
      avgDuration,
      callbackShowRate,
      dncRate,
      volumeScore,
      totalScore,
      coachingNotes: coachingNotes.join('\n'),
    },
    update: {
      connectToInterest: connectToInterestRate,
      interestToClose: interestToCloseRate,
      previewTextRate,
      avgDuration,
      callbackShowRate,
      dncRate,
      volumeScore,
      totalScore,
      coachingNotes: coachingNotes.join('\n'),
    },
  })

  return {
    connectToInterest,
    interestToClose,
    previewTextRate: previewTextScore,
    callDuration: durationScore,
    callbackShowRate: callbackShowScore,
    dncRate: dncScore,
    volumeConsistency: volumeScore,
    totalScore,
    coachingNotes,
  }
}

/**
 * Get the most recent coaching tip for a rep
 */
export async function getCoachingTip(repId: string): Promise<string | null> {
  const latestScoring = await prisma.callScoring.findFirst({
    where: { repId },
    orderBy: { weekStart: 'desc' },
  })

  if (latestScoring?.coachingNotes) {
    const notes = latestScoring.coachingNotes.split('\n').filter(Boolean)
    return notes[0] || null
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
    where: {
      repId,
      date: { gte: startDate },
    },
  })

  const commissions = await prisma.commission.findMany({
    where: {
      repId,
      createdAt: { gte: startDate },
      status: { in: ['APPROVED', 'PAID'] },
    },
  })

  return {
    dials: dailyStats.reduce((sum, d) => sum + d.dials, 0),
    conversations: dailyStats.reduce((sum, d) => sum + d.conversations, 0),
    previewsSent: dailyStats.reduce((sum, d) => sum + d.previewLinksSent, 0),
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