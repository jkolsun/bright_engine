import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/sequences - List all sequences
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const sequences = await prisma.sequence.findMany({
      include: {
        progress: {
          select: {
            id: true,
            clientId: true,
            currentStep: true,
            status: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ sequences })
  } catch (error) {
    console.error('Error fetching sequences:', error)
    return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 })
  }
}

// POST /api/sequences - Create or update sequence
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const data = await request.json()

    const sequence = await prisma.sequence.upsert({
      where: { name: data.name },
      update: {
        steps: data.steps,
        active: data.active ?? true,
      },
      create: {
        name: data.name,
        steps: data.steps,
        active: data.active ?? true,
      }
    })

    return NextResponse.json({ sequence })
  } catch (error) {
    console.error('Error saving sequence:', error)
    return NextResponse.json({ error: 'Failed to save sequence' }, { status: 500 })
  }
}