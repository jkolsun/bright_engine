import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/domain-lookup?domain=example.com
 * Unauthenticated — middleware calls this to resolve custom domains to clientIds.
 * Only returns an opaque clientId, not sensitive data.
 */
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')
  if (!domain) {
    return NextResponse.json({ error: 'domain required' }, { status: 400 })
  }

  const lookupDomain = domain.replace(/^www\./, '').toLowerCase()

  const client = await prisma.client.findFirst({
    where: {
      customDomain: lookupDomain,
      hostingStatus: 'ACTIVE',
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!client) {
    return NextResponse.json({ clientId: null }, { status: 404 })
  }

  return NextResponse.json(
    { clientId: client.id },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    }
  )
}
