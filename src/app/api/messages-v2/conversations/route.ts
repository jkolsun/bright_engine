export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

/**
 * GET /api/messages-v2/conversations — Paginated conversation list grouped by lead
 * Query params: tab, filter, source, search, sort, cursor, limit
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const tab = searchParams.get('tab') || 'pre_client'
    const filterParam = searchParams.get('filter') || ''
    const filters = filterParam ? filterParam.split(',').filter(Boolean) : []
    const source = searchParams.get('source') || ''
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'newest'
    const cursor = searchParams.get('cursor') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

    // Build where clause
    const where: any = {
      messages: { some: {} },
    }

    // Tab filter
    if (tab === 'pre_client') {
      where.client = { is: null }
    } else if (tab === 'post_client') {
      where.client = { isNot: null }
    }

    // Filter pills
    if (filters.includes('hot')) {
      where.smsFunnelStage = { in: ['CLICKED', 'HOT'] }
    }
    if (filters.includes('drip_active')) {
      where.smsFunnelStage = 'DRIP_ACTIVE'
    }
    if (filters.includes('dnc')) {
      where.OR = [
        { dncAt: { not: null } },
        { smsOptedOutAt: { not: null } },
      ]
    }

    // Search
    if (search) {
      const searchConditions = [
        { companyName: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ]
      if (where.OR) {
        // Already have OR from dnc filter — wrap in AND
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ]
        delete where.OR
      } else {
        where.OR = searchConditions
      }
    }

    // Cursor-based pagination
    if (cursor) {
      where.id = { lt: cursor }
    }

    // Sort order
    let orderBy: any
    if (sort === 'oldest_unread') {
      orderBy = { updatedAt: 'asc' as const }
    } else if (sort === 'hottest') {
      orderBy = [{ smsFunnelStage: 'asc' as const }, { updatedAt: 'desc' as const }]
    } else {
      // newest (default)
      orderBy = { updatedAt: 'desc' as const }
    }

    // Fetch leads with conversation data
    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      take: limit + 1,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        closeConversation: {
          select: { stage: true, autonomyLevel: true },
        },
        smsCampaignLeads: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        client: {
          select: { id: true },
        },
      },
    })

    // Check for more pages
    const hasMore = leads.length > limit
    const pagedLeads = hasMore ? leads.slice(0, limit) : leads

    // Post-filter: needs_reply (last message direction is INBOUND)
    let filteredLeads = pagedLeads
    if (filters.includes('needs_reply')) {
      filteredLeads = filteredLeads.filter(lead => {
        const lastMsg = lead.messages[0]
        return lastMsg && lastMsg.direction === 'INBOUND'
      })
    }

    // Source filter
    if (source && source !== 'all') {
      // Source filtering would require checking message senderType — skip for now as
      // it needs a different query strategy. Can be added as post-filter.
    }

    // Build conversation summaries
    const conversations = filteredLeads.map(lead => {
      const lastMessage = lead.messages[0] || null
      const hasUnreadInbound = lastMessage?.direction === 'INBOUND'
      const closeEngine = lead.closeConversation
      const activeCampaignLead = lead.smsCampaignLeads[0] || null

      return {
        leadId: lead.id,
        companyName: lead.companyName,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        smsFunnelStage: lead.smsFunnelStage,
        dncAt: lead.dncAt,
        smsOptedOutAt: lead.smsOptedOutAt,
        assignedToId: lead.assignedToId,
        isClient: !!lead.client,
        hasUnreadInbound,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          direction: lastMessage.direction,
          senderType: lastMessage.senderType,
          senderName: lastMessage.senderName,
          createdAt: lastMessage.createdAt,
        } : null,
        closeEngine: closeEngine ? {
          stage: closeEngine.stage,
          autonomyLevel: closeEngine.autonomyLevel,
        } : null,
        campaignLead: activeCampaignLead ? {
          id: activeCampaignLead.id,
          funnelStage: activeCampaignLead.funnelStage,
          dripCurrentStep: activeCampaignLead.dripCurrentStep,
        } : null,
        updatedAt: lead.updatedAt,
      }
    })

    // Get counts for tabs
    const [preClientCount, postClientCount] = await Promise.all([
      prisma.lead.count({ where: { messages: { some: {} }, client: { is: null } } }),
      prisma.lead.count({ where: { messages: { some: {} }, client: { isNot: null } } }),
    ])

    const nextCursor = hasMore && pagedLeads.length > 0
      ? pagedLeads[pagedLeads.length - 1].id
      : null

    return NextResponse.json({
      conversations,
      counts: { preClient: preClientCount, postClient: postClientCount },
      nextCursor,
      hasMore,
    })
  } catch (error) {
    console.error('Messages V2 conversations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
