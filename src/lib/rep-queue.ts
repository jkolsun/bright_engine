import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Rep Task Queue System
 * Distributes leads to reps' work queues for calling, follow-up, and sales
 */

export interface RepTaskOptions {
  leadId: string
  repId?: string // If null, auto-assign based on availability
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  taskType?: 'INITIAL_CALL' | 'FOLLOW_UP' | 'OBJECTION_HANDLING' | 'CLOSE'
  dueAt?: Date
}

export interface RepTask {
  id: string
  leadId: string
  repId: string | null
  priority: string
  taskType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'
  dueAt: Date
  createdAt: Date
}

/**
 * Create a task in the rep queue
 */
export async function addRepTask(
  options: RepTaskOptions
): Promise<RepTask | null> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: options.leadId },
      include: {
        assignedTo: true,
      },
    })

    if (!lead) {
      console.error(`Lead not found: ${options.leadId}`)
      return null
    }

    // Use assigned rep or fallback to first available rep
    let repId = options.repId || lead.assignedToId
    if (!repId) {
      const availableRep = await prisma.user.findFirst({
        where: {
          role: 'REP',
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'asc', // Round-robin: oldest rep gets next task
        },
      })
      repId = availableRep?.id || null
    }

    // Create task in notes/metadata (could use separate table later)
    const taskData = {
      leadId: options.leadId,
      repId,
      priority: options.priority || 'MEDIUM',
      taskType: options.taskType || 'INITIAL_CALL',
      status: 'PENDING',
      dueAt: options.dueAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24h
      createdAt: new Date(),
    }

    // Store task metadata in lead notes temporarily
    // TODO: Create RepTask table for better tracking
    const lead_update = await prisma.lead.update({
      where: { id: options.leadId },
      data: {
        assignedToId: repId || undefined,
        notes: (lead.notes || '') + `\n[TASK] ${JSON.stringify(taskData)}`,
      },
    })

    // Log activity
    await logActivity(
      'QUEUE_UPDATE',
      `Added to ${repId ? 'rep' : 'unassigned'} queue: ${lead.companyName}`,
      {
        leadId: options.leadId,
        repId: repId || undefined,
        metadata: taskData,
      }
    )

    return {
      id: `${options.leadId}-${Date.now()}`, // Simple ID generation
      leadId: options.leadId,
      repId: repId || null,
      priority: taskData.priority,
      taskType: taskData.taskType,
      status: 'PENDING',
      dueAt: taskData.dueAt,
      createdAt: taskData.createdAt,
    }
  } catch (error) {
    console.error('Rep queue error:', error)
    return null
  }
}

/**
 * Get rep's pending tasks
 */
export async function getRepTasks(
  repId: string,
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
) {
  try {
    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: repId,
        status: {
          not: 'CLOSED_LOST', // Exclude closed leads
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        priority: true,
        personalization: true,
        previewUrl: true,
        createdAt: true,
        notes: true,
      },
      orderBy: [
        { priority: 'desc' }, // Highest priority first
        { createdAt: 'asc' }, // Oldest first (FIFO)
      ],
    })

    return leads
  } catch (error) {
    console.error('Get rep tasks error:', error)
    return []
  }
}

/**
 * Mark task as in-progress (rep starts call)
 */
export async function startTask(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) return null

    // Create call event
    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'CALL_MADE',
        actor: `rep:${lead.assignedToId}`,
      },
    })

    // Log activity
    await logActivity(
      'SCORE_UPDATE',
      `Rep started call with ${lead.companyName}`,
      {
        leadId,
        repId: lead.assignedToId || undefined,
      }
    )

    return true
  } catch (error) {
    console.error('Start task error:', error)
    return false
  }
}

/**
 * Batch add tasks for multiple leads
 */
export async function addRepTasksBatch(
  leadIds: string[],
  repId?: string,
  priority?: string
) {
  const results = await Promise.allSettled(
    leadIds.map((id) =>
      addRepTask({
        leadId: id,
        repId,
        priority: priority as any,
      })
    )
  )

  const successful = results.filter(
    (r) => r.status === 'fulfilled' && (r.value as RepTask | null) !== null
  ).length
  const failed = results.filter((r) => r.status === 'rejected').length

  return {
    successful,
    failed,
    total: leadIds.length,
  }
}
