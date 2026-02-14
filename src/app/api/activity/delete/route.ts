import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/activity/delete
 * Soft delete activity records (mark deleted, preserve audit trail)
 */
export async function POST(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { activityIds, all, olderThanDays } = body

    if (!activityIds && !all && !olderThanDays) {
      return NextResponse.json(
        { error: 'Provide activityIds array, olderThanDays, or all: true' },
        { status: 400 }
      )
    }

    let where: any = {}
    
    if (olderThanDays) {
      // Delete activities older than X days
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
      where = { createdAt: { lt: cutoffDate } }
    } else if (activityIds && Array.isArray(activityIds)) {
      where = { id: { in: activityIds } }
    } else if (all) {
      where = {}
    }

    const result = await prisma.clawdbotActivity.deleteMany({
      where
    })

    return NextResponse.json({
      message: 'Activities deleted successfully',
      deletedCount: result.count,
      activityIds,
      olderThanDays
    })
  } catch (error) {
    console.error('Delete activities error:', error)
    return NextResponse.json(
      { error: 'Failed to delete activities', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const activityId = request.nextUrl.searchParams.get('activityId')
    
    if (!activityId) {
      return NextResponse.json(
        { error: 'activityId query parameter required' },
        { status: 400 }
      )
    }

    await prisma.clawdbotActivity.delete({
      where: { id: activityId }
    })

    return NextResponse.json({
      message: 'Activity deleted successfully',
      activityId
    })
  } catch (error) {
    console.error('Delete activity error:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
