export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    await prisma.upsellTag.update({
      where: { id },
      data: { removedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dialer Upsell Tag API] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
