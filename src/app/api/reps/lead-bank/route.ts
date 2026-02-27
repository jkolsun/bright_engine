import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/reps/lead-bank — Filtered, paginated lead call history (rep-scoped)
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const disposition = searchParams.get('disposition')
    const temperature = searchParams.get('temperature')
    const search = searchParams.get('search')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    // Step A — Build the call filter (always scoped to this rep)
    const callWhere: any = {
      direction: { in: ['OUTBOUND', 'INBOUND'] },
      repId: session.userId,
    }

    if (startDate) {
      callWhere.startedAt = { ...callWhere.startedAt, gte: new Date(startDate) }
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      callWhere.startedAt = { ...callWhere.startedAt, lte: end }
    }
    if (disposition) {
      callWhere.dispositionResult = disposition
    }

    // Step B — Get most recent matching call per lead
    const recentCalls = await prisma.dialerCall.findMany({
      where: callWhere,
      orderBy: { startedAt: 'desc' },
      distinct: ['leadId'],
      select: {
        id: true,
        leadId: true,
        repId: true,
        dispositionResult: true,
        startedAt: true,
        duration: true,
        notes: true,
      },
    })

    if (recentCalls.length === 0) {
      return NextResponse.json({
        leads: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hotCount: 0,
        warmCount: 0,
        coldCount: 0,
      })
    }

    // Step C — Filter leads
    const leadIds = recentCalls.map(c => c.leadId)

    const leadWhere: any = {
      id: { in: leadIds },
      status: { notIn: ['DO_NOT_CONTACT', 'CLOSED_LOST', 'PAID'] },
    }

    if (temperature) {
      if (temperature === 'COLD') {
        leadWhere.priority = { in: ['COLD', 'NORMAL'] }
      } else {
        leadWhere.priority = temperature
      }
    }

    if (search) {
      leadWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const filteredLeads = await prisma.lead.findMany({
      where: leadWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        status: true,
        priority: true,
        engagementScore: true,
        engagementLevel: true,
        previewUrl: true,
        previewId: true,
      },
    })

    const filteredLeadIds = new Set(filteredLeads.map(l => l.id))

    const callByLead = new Map<string, typeof recentCalls[0]>()
    for (const call of recentCalls) {
      if (filteredLeadIds.has(call.leadId)) {
        callByLead.set(call.leadId, call)
      }
    }

    const orderedLeadIds = recentCalls
      .filter(c => filteredLeadIds.has(c.leadId))
      .map(c => c.leadId)

    const leadMap = new Map(filteredLeads.map(l => [l.id, l]))
    let hotCount = 0
    let warmCount = 0
    let coldCount = 0
    for (const id of orderedLeadIds) {
      const lead = leadMap.get(id)
      if (!lead) continue
      if (lead.priority === 'HOT') hotCount++
      else if (lead.priority === 'WARM') warmCount++
      else coldCount++
    }

    // Step D — Paginate
    const total = orderedLeadIds.length
    const totalPages = Math.ceil(total / limit)
    const offset = (page - 1) * limit
    const pageLeadIds = orderedLeadIds.slice(offset, offset + limit)

    // Step E — Build response
    const leads = pageLeadIds.map(id => {
      const lead = leadMap.get(id)!
      const call = callByLead.get(id)!
      return {
        ...lead,
        lastCall: {
          id: call.id,
          dispositionResult: call.dispositionResult,
          startedAt: call.startedAt,
          duration: call.duration,
          notes: call.notes,
          repId: call.repId,
          repName: null, // Rep page doesn't need rep name (it's always themselves)
        },
      }
    })

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages,
      hotCount,
      warmCount,
      coldCount,
    })
  } catch (error) {
    console.error('LeadBank rep error:', error)
    return NextResponse.json({ error: 'Failed to fetch lead bank' }, { status: 500 })
  }
}
