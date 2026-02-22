export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const products = await prisma.upsellProduct.findMany({
      where: { active: true },
      select: { id: true, name: true, price: true, description: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('[Upsell Products Pitch Notes API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
