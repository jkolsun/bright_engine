import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/leads/social-stats
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const [total, withInstagram, withLinkedIn, withBoth] = await Promise.all([
      prisma.lead.count({ where: { dncAt: null, status: { not: 'DO_NOT_CONTACT' } } }),
      prisma.lead.count({ where: { instagramHandle: { not: null }, dncAt: null } }),
      prisma.lead.count({ where: { linkedinUrl: { not: null }, dncAt: null } }),
      prisma.lead.count({ where: { instagramHandle: { not: null }, linkedinUrl: { not: null }, dncAt: null } }),
    ])

    return NextResponse.json({
      total,
      withInstagram,
      withLinkedIn,
      withBoth,
      instagramPct: total > 0 ? Math.round((withInstagram / total) * 100) : 0,
      linkedinPct: total > 0 ? Math.round((withLinkedIn / total) * 100) : 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
