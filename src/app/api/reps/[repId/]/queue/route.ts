import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRepTasks } from '@/lib/rep-queue'
import { calculateEngagementScore } from '@/lib/engagement-scoring'

/**
 * GET /api/reps/[repId]/queue
 * Returns rep's active task queue, sorted by priority + engagement
 * Used by dialer UI to show next leads to call
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { repId: string } }
) {
  try {
    const repId = params.repId

    // Verify rep exists
    const rep = await prisma.user.findUnique({
      where: { id: repId },
    })

    if (!rep || rep.role !== 'REP') {
      return NextResponse.json(
        { error: 'Rep not found' },
        { status: 404 }
      )
    }

    // Get rep's assigned leads
    const tasks = await getRepTasks(repId)

    // Enrich with engagement scores and company data
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const score = await calculateEngagementScore(task.id)
        return {
          ...task,
          engagement: score,
        }
      })
    )

    // Sort by: URGENT/HIGH priority → engagement HOT → recency
    const sorted = enrichedTasks.sort((a, b) => {
      const priorityMap = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const aPri = priorityMap[a.priority as keyof typeof priorityMap] ?? 3
      const bPri = priorityMap[b.priority as keyof typeof priorityMap] ?? 3

      if (aPri !== bPri) return aPri - bPri

      const engagementOrder = { HOT: 0, WARM: 1, COLD: 2 }
      const aEng = engagementOrder[a.engagement.level as keyof typeof engagementOrder] ?? 2
      const bEng = engagementOrder[b.engagement.level as keyof typeof engagementOrder] ?? 2

      if (aEng !== bEng) return aEng - bEng

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    return NextResponse.json({
      repId,
      queueCount: sorted.length,
      queue: sorted.map((task) => ({
        leadId: task.id,
        company: task.companyName,
        contact: `${task.firstName} ${task.lastName}`,
        email: task.email,
        phone: task.phone,
        priority: task.priority,
        engagement: {
          level: task.engagement.level,
          score: task.engagement.score,
          temperature: task.engagement.temperature,
        },
        personalization: task.personalization,
        previewUrl: task.previewUrl,
        createdAt: task.createdAt,
      })),
    })
  } catch (error) {
    console.error('Get rep queue error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    )
  }
}
