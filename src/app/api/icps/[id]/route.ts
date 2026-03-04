import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params

    const icp = await prisma.iCP.findUnique({
      where: { id },
      include: {
        _count: { select: { scraperRuns: true, leads: true } },
      },
    })

    if (!icp) {
      return NextResponse.json({ error: 'ICP not found' }, { status: 404 })
    }

    return NextResponse.json({ icp })
  } catch (error) {
    console.error('Get ICP error:', error)
    return NextResponse.json({ error: 'Failed to get ICP' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const data: any = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.description !== undefined) data.description = body.description || null
    if (body.active !== undefined) data.active = body.active
    if (body.targetIndustries !== undefined) data.targetIndustries = body.targetIndustries
    if (body.targetStates !== undefined) data.targetStates = body.targetStates
    if (body.minReviews !== undefined) data.minReviews = body.minReviews
    if (body.minRating !== undefined) data.minRating = body.minRating
    if (body.repAllocation !== undefined) data.repAllocation = body.repAllocation
    if (body.instantlyCampaignId !== undefined) data.instantlyCampaignId = body.instantlyCampaignId
    if (body.instantlyCampaignName !== undefined) data.instantlyCampaignName = body.instantlyCampaignName
    if (body.smsEnabled !== undefined) data.smsEnabled = body.smsEnabled
    if (body.smsTemplate !== undefined) data.smsTemplate = body.smsTemplate

    const icp = await prisma.iCP.update({
      where: { id },
      data,
    })

    return NextResponse.json({ icp })
  } catch (error) {
    console.error('Update ICP error:', error)
    return NextResponse.json({ error: 'Failed to update ICP' }, { status: 500 })
  }
}

// Soft-deactivate — never hard-delete
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await params

    const icp = await prisma.iCP.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ icp })
  } catch (error) {
    console.error('Deactivate ICP error:', error)
    return NextResponse.json({ error: 'Failed to deactivate ICP' }, { status: 500 })
  }
}
