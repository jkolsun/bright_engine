import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    const config = await prisma.scraperConfig.findUnique({ where: { id } })
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const config = await prisma.scraperConfig.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.searchTerms !== undefined && { searchTerms: body.searchTerms }),
        ...(body.cities !== undefined && { cities: body.cities }),
        ...(body.minReviews !== undefined && { minReviews: body.minReviews }),
        ...(body.minRating !== undefined && { minRating: body.minRating }),
        ...(body.targetLeads !== undefined && { targetLeads: body.targetLeads }),
        ...(body.advancedFilters !== undefined && { advancedFilters: body.advancedFilters }),
        ...(body.cityMode !== undefined && { cityMode: body.cityMode }),
        ...(body.schedule !== undefined && { schedule: body.schedule }),
      },
    })

    return NextResponse.json({ config })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    await prisma.scraperConfig.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}
