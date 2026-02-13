import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/admin/cleanup-database
 * ADMIN ONLY - Clears all test/sample data
 * Body: { confirm: true } - Safety check
 */
export async function POST(request: NextRequest) {
  try {
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

    // Get preserved user IDs
    const preservedUsers = await prisma.user.findMany({
      where: {
        email: { in: [adminEmail, andrewEmail] }
      }
    })
    const preservedIds = preservedUsers.map(u => u.id)

    // Delete all leads (soft delete via CLOSED_LOST)
    const leadResult = await prisma.lead.updateMany({
      data: { status: 'CLOSED_LOST' }
    })

    // Delete all clients
    const clientResult = await prisma.client.deleteMany({})

    // Delete all activities
    const activityResult = await prisma.clawdbotActivity.deleteMany({})

    // Delete all lead events
    const eventResult = await prisma.leadEvent.deleteMany({})

    // Delete all messages
    const messageResult = await prisma.message.deleteMany({})

    // Delete all non-admin users (except admin + andrew)
    const userResult = await prisma.user.deleteMany({
      where: {
        id: { notIn: preservedIds }
      }
    })

    return NextResponse.json({
      status: 'ok',
      message: 'Database cleaned successfully',
      cleared: {
        leads: leadResult.count,
        clients: clientResult.count,
        activities: activityResult.count,
        events: eventResult.count,
        messages: messageResult.count,
        users: userResult.count,
      },
      preserved: {
        users: preservedUsers.map(u => ({ id: u.id, email: u.email, name: u.name }))
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
