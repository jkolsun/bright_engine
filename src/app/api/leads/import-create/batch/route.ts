import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leads/import-create/batch
 * Batch-update staging leads with batchName, folderId, assignTo.
 * Optionally graduate leads to NEW when `graduate: true` (used by "Skip Processing").
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadIds, batchName, folderId, assignTo, graduate } = await request.json() as {
      leadIds: string[]
      batchName: string
      folderId?: string
      assignTo?: string
      graduate?: boolean
    }

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: 'leadIds array is required' }, { status: 400 })
    }
    if (!batchName || !batchName.trim()) {
      return NextResponse.json({ error: 'batchName is required' }, { status: 400 })
    }

    const data: any = {
      campaign: batchName.trim(),
      sourceDetail: batchName.trim(),
      folderId: folderId || null,
      assignedToId: assignTo || null,
    }

    if (graduate) {
      data.status = 'NEW'
    }

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
        status: 'IMPORT_STAGING',
      },
      data,
    })

    // Update the most recent IMPORT activity log to include the batch name
    try {
      const recentActivity = await prisma.clawdbotActivity.findFirst({
        where: { actionType: 'IMPORT' },
        orderBy: { createdAt: 'desc' },
      })
      if (recentActivity) {
        await prisma.clawdbotActivity.update({
          where: { id: recentActivity.id },
          data: {
            description: `${batchName.trim()} — ${recentActivity.description}`,
          },
        })
      }
    } catch (err) {
      console.warn('[Batch] Failed to update activity log description:', err)
    }

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Batch update error:', error)
    return NextResponse.json(
      { error: 'Batch update failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
