import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Create a test clawdbot_activity record
    const activity = await prisma.clawdbotActivity.create({
      data: {
        actionType: 'HEARTBEAT',
        description: 'Test activity from STEP 3',
      },
    })

    // Read it back to verify
    const read = await prisma.clawdbotActivity.findUnique({
      where: { id: activity.id },
    })

    return Response.json({
      status: 'ok',
      message: 'clawdbot_activity table working',
      created: activity,
      read: read,
    })
  } catch (error) {
    return Response.json(
      {
        status: 'error',
        message: 'clawdbot_activity test failed',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
