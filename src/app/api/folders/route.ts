import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/folders — List all folders with lead counts
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const folders = await prisma.leadFolder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            leads: { where: { status: { notIn: ['CLOSED_LOST', 'PAID'] } } },
          },
        },
      },
    })

    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Folders fetch error:', error)
    return NextResponse.json({ folders: [] })
  }
}

// POST /api/folders — Create a new folder
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { name, color } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    const folder = await prisma.leadFolder.create({
      data: {
        name: name.trim(),
        color: color || '#3B82F6',
      },
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Folder create error:', error)
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 })
  }
}
