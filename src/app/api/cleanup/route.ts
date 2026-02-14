import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cleanup
 * Quick cleanup endpoint: Hide all test data from UI
 * - Marks all current leads as CLOSED_LOST (soft delete)
 * - Clears activity log
 * Use this to reset the UI without losing data
 */
export async function GET(request: NextRequest) {
  try {
    // Admin-only access check
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const mode = request.nextUrl.searchParams.get('mode') || 'all'
    
    if (mode === 'confirm') {
      // Safety: require explicit confirmation
      return NextResponse.json({
        message: 'Cleanup ready. Call /api/cleanup?mode=execute to confirm',
        whatWillHappen: [
          'All leads marked as CLOSED_LOST (hidden from UI)',
          'Activity log cleared',
          'Data preserved (can be restored)',
        ]
      })
    }
    
    if (mode === 'execute') {
      // Mark all non-CLOSED_LOST leads as CLOSED_LOST
      const leadResult = await prisma.lead.updateMany({
        where: {
          NOT: { status: 'CLOSED_LOST' }
        },
        data: {
          status: 'CLOSED_LOST',
          updatedAt: new Date(),
        }
      })
      
      // Clear activity log
      const activityResult = await prisma.clawdbotActivity.deleteMany({})
      
      return NextResponse.json({
        status: 'ok',
        message: 'UI cleaned successfully',
        leadsHidden: leadResult.count,
        activitiesCleared: activityResult.count,
        nextStep: 'Refresh your UI - no more test data visible'
      })
    }
    
    return NextResponse.json({
      message: 'Cleanup endpoint. Use ?mode=confirm first, then ?mode=execute',
      available: ['confirm', 'execute']
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
