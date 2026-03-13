import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/social-campaigns/[id]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { id } = await context.params
  const campaign = await prisma.socialCampaign.findUnique({
    where: { id },
    include: {
      leads: {
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              companyName: true,
              industry: true,
              city: true,
              state: true,
              previewUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      },
    },
  })

  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ campaign })
}

// PUT /api/social-campaigns/[id]
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
    const campaign = await prisma.socialCampaign.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.status && { status: body.status }),
        ...(body.templateDm1 && { templateDm1: body.templateDm1 }),
        ...(body.templateDm2Click && { templateDm2Click: body.templateDm2Click }),
        ...(body.templateDm2NoClick && { templateDm2NoClick: body.templateDm2NoClick }),
        ...(body.templateDm3 !== undefined && { templateDm3: body.templateDm3 }),
        ...(body.bookingLink !== undefined && { bookingLink: body.bookingLink }),
      },
    })
    return NextResponse.json({ campaign })
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE /api/social-campaigns/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionCookie = request.cookies.get('session')?.value
  const session = sessionCookie ? await verifySession(sessionCookie) : null
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 })
  }

  const { id } = await context.params
  const campaign = await prisma.socialCampaign.findUnique({ where: { id } })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (campaign.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Only DRAFT campaigns can be deleted' }, { status: 400 })
  }

  await prisma.socialCampaignMessage.deleteMany({ where: { campaignId: id } })
  await prisma.socialCampaignLead.deleteMany({ where: { campaignId: id } })
  await prisma.socialCampaign.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
