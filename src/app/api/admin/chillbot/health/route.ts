import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || (session.role !== 'ADMIN' && session.role !== 'CHILLBOT')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Simple DB check first
    const dbCheck = await prisma.$queryRaw`SELECT 1 as health`
      .then(() => 'connected')
      .catch((e: any) => 'error: ' + String(e))

    const leadCount = await prisma.lead.count()
    const clientCount = await prisma.client.count({ where: { hostingStatus: 'ACTIVE' } })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      database: dbCheck,
      leads: leadCount,
      activeClients: clientCount,
      health: { status: 'healthy' },
    })
  } catch (error) {
    console.error('[ChillBot Health] Error:', error)
    return NextResponse.json(
      { error: 'Health check failed', detail: String(error) },
      { status: 500 }
    )
  }
}
