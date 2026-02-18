import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/prompt-versions - List prompt versions
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const versions = await prisma.promptVersion.findMany({
      orderBy: { version: 'desc' },
    })

    return NextResponse.json({ versions })
  } catch (error) {
    console.error('Error fetching prompt versions:', error)
    return NextResponse.json({ error: 'Failed to fetch prompt versions' }, { status: 500 })
  }
}

// POST /api/prompt-versions - Create new prompt version
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    // Deactivate all existing versions
    await prisma.promptVersion.updateMany({
      data: { active: false }
    })

    // Get next version number
    const latest = await prisma.promptVersion.findFirst({
      orderBy: { version: 'desc' }
    })
    const nextVersion = (latest?.version || 0) + 1

    const version = await prisma.promptVersion.create({
      data: {
        version: nextVersion,
        content: data.content,
        changeNotes: data.changeNotes,
        active: true,
      }
    })

    return NextResponse.json({ version })
  } catch (error) {
    console.error('Error creating prompt version:', error)
    return NextResponse.json({ error: 'Failed to create prompt version' }, { status: 500 })
  }
}