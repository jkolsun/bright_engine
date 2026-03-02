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

    const lists = await prisma.cityList.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ lists })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list city lists' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { name, cities } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return NextResponse.json({ error: 'Cities array is required' }, { status: 400 })
    }

    const list = await prisma.cityList.create({
      data: {
        name: name.trim(),
        cities: cities,
      },
    })

    return NextResponse.json({ list }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create city list' }, { status: 500 })
  }
}
