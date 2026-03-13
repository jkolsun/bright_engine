import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// PUT /api/leads/[id]/social
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const { instagramHandle, linkedinUrl, source = 'manual' } = body

    // Validate LinkedIn URL format if provided
    if (linkedinUrl && !linkedinUrl.includes('linkedin.com')) {
      return NextResponse.json({ error: 'Invalid LinkedIn URL' }, { status: 400 })
    }

    // Normalize Instagram handle — strip @ prefix and URL cruft if pasted
    let cleanHandle = instagramHandle
    if (cleanHandle) {
      cleanHandle = cleanHandle
        .replace(/^@/, '')
        .replace(/.*instagram\.com\//, '')
        .replace(/\/$/, '')
        .trim()
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        instagramHandle: cleanHandle || null,
        linkedinUrl: linkedinUrl || null,
        socialEnrichedAt: new Date(),
        socialEnrichSource: source,
      },
      select: {
        id: true,
        instagramHandle: true,
        linkedinUrl: true,
        socialEnrichedAt: true,
        socialEnrichSource: true,
      },
    })

    return NextResponse.json({ lead: updated })
  } catch (error) {
    console.error('Social handle update error:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
