import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const icps = await prisma.iCP.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { scraperRuns: true, leads: true } },
      },
    })

    return NextResponse.json({ icps })
  } catch (error) {
    console.error('List ICPs error:', error)
    return NextResponse.json({ error: 'Failed to list ICPs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, targetIndustries, targetStates, minReviews, minRating, description } = body as {
      name: string
      targetIndustries: string[]
      targetStates: string[]
      minReviews?: number
      minRating?: number
      description?: string
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!targetIndustries || targetIndustries.length === 0) {
      return NextResponse.json({ error: 'At least one industry is required' }, { status: 400 })
    }
    if (!targetStates || targetStates.length === 0) {
      return NextResponse.json({ error: 'At least one state is required' }, { status: 400 })
    }

    const icp = await prisma.iCP.create({
      data: {
        name: name.trim(),
        description: description || null,
        targetIndustries: targetIndustries as any,
        targetStates: targetStates as any,
        minReviews: minReviews ?? 3,
        minRating: minRating ?? 3.5,
      },
    })

    return NextResponse.json({ icp })
  } catch (error) {
    console.error('Create ICP error:', error)
    return NextResponse.json({ error: 'Failed to create ICP' }, { status: 500 })
  }
}
