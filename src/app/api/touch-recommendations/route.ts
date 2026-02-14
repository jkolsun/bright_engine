import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { RecommendationType, RecommendationPriority } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const type = searchParams.get('type') as RecommendationType | null
    const priority = searchParams.get('priority') as RecommendationPriority | null
    const actionTaken = searchParams.get('actionTaken')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const where: any = {}
    if (leadId) where.leadId = leadId
    if (type) where.type = type
    if (priority) where.priority = priority
    
    // Filter by action taken status
    if (actionTaken === 'true') {
      where.actionTakenAt = { not: null }
    } else if (actionTaken === 'false') {
      where.actionTakenAt = null
    }

    const recommendations = await prisma.touchRecommendation.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { suggestedAt: 'desc' },
      take: limit,
    })

    // Calculate stats
    const stats = {
      total: recommendations.length,
      pending: recommendations.filter((r) => !r.actionTakenAt).length,
      completed: recommendations.filter((r) => r.actionTakenAt).length,
      byPriority: {
        urgent: recommendations.filter((r) => r.priority === 'URGENT').length,
        high: recommendations.filter((r) => r.priority === 'HIGH').length,
        medium: recommendations.filter((r) => r.priority === 'MEDIUM').length,
        low: recommendations.filter((r) => r.priority === 'LOW').length,
      },
    }

    return NextResponse.json({ recommendations, stats })
  } catch (error) {
    console.error('Touch recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch touch recommendations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      leadId,
      type,
      priority = 'MEDIUM',
      reason,
      confidence,
      metadata,
    } = body

    if (!leadId || !type || !reason) {
      return NextResponse.json(
        { error: 'leadId, type, and reason are required' },
        { status: 400 }
      )
    }

    const recommendation = await prisma.touchRecommendation.create({
      data: {
        leadId,
        type,
        priority,
        reason,
        confidence: confidence || 0.5,
        metadata,
        suggestedAt: new Date(),
      },
      include: {
        lead: true,
      },
    })

    return NextResponse.json({ recommendation }, { status: 201 })
  } catch (error) {
    console.error('Touch recommendation creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create touch recommendation' },
      { status: 500 }
    )
  }
}

// Mark recommendation as action taken
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { recommendationId, actionType } = body

    if (!recommendationId) {
      return NextResponse.json(
        { error: 'recommendationId is required' },
        { status: 400 }
      )
    }

    const updated = await prisma.touchRecommendation.update({
      where: { id: recommendationId },
      data: {
        actionTakenAt: new Date(),
        actionType,
      },
    })

    return NextResponse.json({ recommendation: updated })
  } catch (error) {
    console.error('Recommendation update error:', error)
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    )
  }
}
