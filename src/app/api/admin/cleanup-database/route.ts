import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/cleanup-database
 * ADMIN ONLY - Clears all test/sample data
 * Body: { confirm: true } - Safety check
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
    
    if (!body.confirm) {
      return NextResponse.json(
        { error: 'Confirmation required. Send { confirm: true }' },
        { status: 400 }
      )
    }

    // Delete all test data (keep only admin + andrew rep)
    const adminEmail = 'admin@brightautomations.net'
    const andrewEmail = 'andrew@brightautomations.net'

    // Use transaction to ensure all-or-nothing cleanup
    const results = await prisma.$transaction(async (tx) => {
      // Get preserved user IDs
      const preservedUsers = await tx.user.findMany({
        where: {
          email: { in: [adminEmail, andrewEmail] }
        }
      })
      const preservedIds = preservedUsers.map(u => u.id)

      // Delete all leads (soft delete via CLOSED_LOST)
      const leadResult = await tx.lead.updateMany({
        data: { status: 'CLOSED_LOST' }
      })

      // Delete all clients
      const clientResult = await tx.client.deleteMany({})

      // Delete all activities
      const activityResult = await tx.clawdbotActivity.deleteMany({})

      // Delete all lead events
      const eventResult = await tx.leadEvent.deleteMany({})

      // Delete all messages
      const messageResult = await tx.message.deleteMany({})

      // Delete all non-admin users (except admin + andrew)
      const userResult = await tx.user.deleteMany({
        where: {
          id: { notIn: preservedIds }
        }
      })

      return {
        preservedUsers,
        leadResult,
        clientResult,
        activityResult,
        eventResult,
        messageResult,
        userResult
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Database cleaned successfully',
      cleared: {
        leads: results.leadResult.count,
        clients: results.clientResult.count,
        activities: results.activityResult.count,
        events: results.eventResult.count,
        messages: results.messageResult.count,
        users: results.userResult.count,
      },
      preserved: {
        users: results.preservedUsers.map(u => ({ id: u.id, email: u.email, name: u.name }))
      }
    })
  } catch (error) {
    console.error('Database cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
