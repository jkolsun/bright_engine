export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// Terminal dispositions — leads in "Called" tab
const TERMINAL_DISPOSITIONS = [
  'WANTS_TO_MOVE_FORWARD', 'NOT_INTERESTED', 'DNC', 'WRONG_NUMBER',
  'DISCONNECTED', 'WANTS_CHANGES', 'WILL_LOOK_LATER', 'INTERESTED_VERBAL',
  'CALLBACK', 'NO_ANSWER', 'VOICEMAIL',
]

// Retry-eligible dispositions
const RETRY_DISPOSITIONS = ['NO_ANSWER', 'VOICEMAIL']

// Cooldown periods in milliseconds
const COOLDOWN_MS: Record<string, number> = {
  NO_ANSWER: 24 * 60 * 60 * 1000,  // 24 hours
  VOICEMAIL: 48 * 60 * 60 * 1000,   // 48 hours
}

const MAX_RETRY_ATTEMPTS = 3

const BASE_SELECT = {
  id: true, companyName: true, firstName: true, lastName: true,
  phone: true, secondaryPhone: true, email: true, status: true, priority: true,
  city: true, state: true, industry: true, ownerRepId: true,
  previewId: true, previewUrl: true,
  _count: { select: { dialerCalls: true } },
}

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const repId = searchParams.get('repId')
    const tab = searchParams.get('tab')

    const targetRepId = (session.role === 'ADMIN' && repId) ? repId : session.userId

    const baseWhere: Prisma.LeadWhereInput = {
      OR: [
        { ownerRepId: targetRepId },
        { assignedToId: targetRepId },
      ],
      status: { notIn: ['CLOSED_LOST', 'DO_NOT_CONTACT', 'PAID'] },
      dncAt: null,
    }

    // --- FRESH: leads with zero outbound calls ---
    if (tab === 'fresh') {
      const whereClause: Prisma.LeadWhereInput = {
        ...baseWhere,
        dialerCalls: { none: { direction: 'OUTBOUND' } },
      }

      const [leads, totalCount] = await Promise.all([
        prisma.lead.findMany({
          where: whereClause,
          select: BASE_SELECT,
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          take: 500,
        }),
        prisma.lead.count({ where: whereClause }),
      ])

      return NextResponse.json({ leads, hasMore: totalCount > 500, totalCount })
    }

    // --- RETRY: No Answer / Voicemail with cooldown + max 3 attempts ---
    if (tab === 'retry') {
      // Fetch leads that have outbound calls with retry-eligible dispositions
      const leads = await prisma.lead.findMany({
        where: {
          ...baseWhere,
          dialerCalls: { some: { direction: 'OUTBOUND' } },
        },
        select: {
          ...BASE_SELECT,
          dialerCalls: {
            where: { direction: 'OUTBOUND' },
            select: { startedAt: true, dispositionResult: true },
            orderBy: { startedAt: 'desc' },
          },
        },
        take: 500,
      })

      const now = Date.now()
      const retryLeads = leads.filter(lead => {
        const outboundCalls = lead.dialerCalls
        if (!outboundCalls.length) return false
        // Check max attempts
        if (outboundCalls.length > MAX_RETRY_ATTEMPTS) return false

        const mostRecent = outboundCalls[0] // already sorted desc
        if (!mostRecent.dispositionResult || !RETRY_DISPOSITIONS.includes(mostRecent.dispositionResult)) return false

        // Check cooldown
        const cooldown = COOLDOWN_MS[mostRecent.dispositionResult] || COOLDOWN_MS.NO_ANSWER
        const elapsed = now - new Date(mostRecent.startedAt).getTime()
        return elapsed >= cooldown
      })

      // Sort by oldest last-dialed first (leads waiting longest get called first)
      retryLeads.sort((a, b) => {
        const aTime = new Date(a.dialerCalls[0]?.startedAt || 0).getTime()
        const bTime = new Date(b.dialerCalls[0]?.startedAt || 0).getTime()
        return aTime - bTime
      })

      // Strip dialerCalls from response to match QueueLead shape
      const cleanLeads = retryLeads.map(({ dialerCalls, ...lead }) => lead)
      return NextResponse.json({ leads: cleanLeads.slice(0, 500), hasMore: cleanLeads.length > 500, totalCount: cleanLeads.length })
    }

    // --- CALLED: terminal disposition leads ---
    if (tab === 'called') {
      const leads = await prisma.lead.findMany({
        where: {
          ...baseWhere,
          dialerCalls: { some: { direction: 'OUTBOUND' } },
        },
        select: {
          ...BASE_SELECT,
          dialerCalls: {
            where: { direction: 'OUTBOUND' },
            select: { startedAt: true, dispositionResult: true },
            orderBy: { startedAt: 'desc' },
            take: 1,
          },
        },
        take: 500,
      })

      // Filter to leads where most recent outbound call has a terminal disposition
      const calledLeads = leads.filter(lead => {
        const mostRecent = lead.dialerCalls[0]
        return mostRecent?.dispositionResult && TERMINAL_DISPOSITIONS.includes(mostRecent.dispositionResult)
      })

      // Sort by most recently called first
      calledLeads.sort((a, b) => {
        const aTime = new Date(a.dialerCalls[0]?.startedAt || 0).getTime()
        const bTime = new Date(b.dialerCalls[0]?.startedAt || 0).getTime()
        return bTime - aTime
      })

      // Add disposition to the lead for display, strip dialerCalls
      const cleanLeads = calledLeads.map(({ dialerCalls, ...lead }) => ({
        ...lead,
        lastDisposition: dialerCalls[0]?.dispositionResult || null,
      }))
      return NextResponse.json({ leads: cleanLeads.slice(0, 500), hasMore: cleanLeads.length > 500, totalCount: cleanLeads.length })
    }

    // --- DEFAULT (no tab) — all leads (original behavior) ---
    const whereClause = baseWhere

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where: whereClause,
        select: BASE_SELECT,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        take: 500,
      }),
      prisma.lead.count({ where: whereClause }),
    ])

    return NextResponse.json({ leads, hasMore: totalCount > 500, totalCount })
  } catch (error) {
    console.error('[Dialer Queue API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
