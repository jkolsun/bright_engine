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

    const configs = await prisma.scraperConfig.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { runs: true } },
      },
    })

    return NextResponse.json({ configs })
  } catch (error) {
    console.error('List configs error:', error)
    return NextResponse.json({ error: 'Failed to list configs' }, { status: 500 })
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
    const { name, searchTerms, cities, minReviews, minRating, targetLeads, advancedFilters, cityMode, schedule } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const config = await prisma.scraperConfig.create({
      data: {
        name: name.trim(),
        searchTerms: searchTerms || [],
        cities: cities || [],
        minReviews: minReviews ?? 5,
        minRating: minRating ?? 3.5,
        targetLeads: targetLeads ?? 400,
        advancedFilters: advancedFilters || null,
        cityMode: cityMode || 'major',
        schedule: schedule || null,
      },
    })

    return NextResponse.json({ config }, { status: 201 })
  } catch (error) {
    console.error('Create config error:', error)
    return NextResponse.json({ error: 'Failed to create config' }, { status: 500 })
  }
}
