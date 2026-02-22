export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { userId } = await params
    const { twilioNumber1, twilioNumber2 } = await request.json()

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(twilioNumber1 !== undefined ? { twilioNumber1 } : {}),
        ...(twilioNumber2 !== undefined ? { twilioNumber2 } : {}),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Admin Rep Numbers API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
