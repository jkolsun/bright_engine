import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/folders/assign — Add leads to a folder
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadIds, folderId } = await request.json()
    if (!leadIds?.length) {
      return NextResponse.json({ error: 'leadIds required' }, { status: 400 })
    }

    const updated = await prisma.lead.updateMany({
      where: { id: { in: leadIds } },
      data: { folderId: folderId || null },
    })

    return NextResponse.json({ updated: updated.count })
  } catch (error) {
    console.error('Folder assign error:', error)
    return NextResponse.json({ error: 'Failed to assign to folder' }, { status: 500 })
  }
}
