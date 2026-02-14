import { prisma } from './db'

/**
 * Rep Task Queue Management
 */

export interface RepTaskOptions {
  leadId: string
  repId?: string
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  taskType: 'INITIAL_CALL' | 'FOLLOWUP' | 'CALLBACK' | 'URGENT_FOLLOWUP' | 'RE_ENGAGEMENT'
  notes?: string
  dueAt?: Date
}

export async function addRepTask(options: RepTaskOptions) {
  try {
    // If no rep specified, find the next available rep
    let repId = options.repId
    
    if (!repId) {
      const availableRep = await prisma.user.findFirst({
        where: { 
          role: 'REP',
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'asc' } // Round-robin by creation date
      })
      
      if (availableRep) {
        repId = availableRep.id
      }
    }

    if (!repId) {
      throw new Error('No available reps for task assignment')
    }

    const task = await prisma.repTask.create({
      data: {
        leadId: options.leadId,
        repId,
        priority: options.priority,
        taskType: options.taskType,
        status: 'PENDING',
        dueAt: options.dueAt || new Date(),
        notes: options.notes
      }
    })

    // Also assign the lead to this rep if not already assigned
    await prisma.lead.update({
      where: { id: options.leadId },
      data: { assignedToId: repId }
    })

    return task
  } catch (error) {
    console.error('Add rep task error:', error)
    throw error
  }
}