import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/build-status/[leadId] — Get build status for a lead
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leadId } = await context.params

    const buildStatus = await prisma.buildStatus.findUnique({
      where: { leadId },
    })

    return NextResponse.json(buildStatus || null)
  } catch (error) {
    console.error('Error fetching build status:', error)
    return NextResponse.json({ error: 'Failed to fetch build status' }, { status: 500 })
  }
}

/**
 * PUT /api/build-status/[leadId] — Update build status or trigger push
 * Body: { field: value } pairs to update, or { action: 'push' } to push to build
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadId } = await context.params
    const body = await request.json()

    // Handle "Push to Build" action
    if (body.action === 'push') {
      const buildStatus = await prisma.buildStatus.upsert({
        where: { leadId },
        create: { leadId, status: 'building', lastPushedAt: new Date() },
        update: { status: 'building', lastPushedAt: new Date() },
      })

      // Update lead build step to trigger QA review
      await prisma.lead.update({
        where: { id: leadId },
        data: { buildStep: 'QA_REVIEW' },
      })

      // Create notification
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { companyName: true },
      })
      await prisma.notification.create({
        data: {
          type: 'SITE_QA_READY',
          title: 'Build Pushed',
          message: `Build pushed for ${lead?.companyName || 'Unknown'}. Ready for QA review.`,
          metadata: { leadId },
        },
      })

      return NextResponse.json(buildStatus)
    }

    // General field update
    const allowedFields = [
      'servicesCollected', 'servicesData', 'hoursCollected', 'hoursData',
      'logoCollected', 'logoUrl', 'photosCollected', 'photosData',
      'companyNameConfirmed', 'companyNameOverride', 'colorPrefsCollected', 'status',
    ]
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Inherit global auto-push for new records
    let globalAutoPush = true
    try {
      const setting = await prisma.settings.findUnique({ where: { key: 'globalAutoPush' } })
      if (setting?.value && typeof setting.value === 'object' && 'enabled' in (setting.value as Record<string, unknown>)) {
        globalAutoPush = (setting.value as Record<string, unknown>).enabled !== false
      }
    } catch { /* default to true */ }

    const buildStatus = await prisma.buildStatus.upsert({
      where: { leadId },
      create: { leadId, autoPush: globalAutoPush, ...updateData },
      update: updateData,
    })

    // Auto-push check: use GLOBAL setting (not per-lead) + services collected
    if (globalAutoPush && buildStatus.servicesCollected && buildStatus.status !== 'building') {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { buildStep: true, companyName: true },
      })
      const siteBuildSteps = ['QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE']
      if (!lead?.buildStep || !siteBuildSteps.includes(lead.buildStep)) {
        await prisma.buildStatus.update({
          where: { leadId },
          data: { status: 'building', lastPushedAt: new Date() },
        })
        await prisma.lead.update({
          where: { id: leadId },
          data: { buildStep: 'QA_REVIEW' },
        })
        await prisma.notification.create({
          data: {
            type: 'SITE_QA_READY',
            title: 'Auto-Push: Build Ready',
            message: `Auto-pushed build for ${lead?.companyName || 'Unknown'}. Ready for QA review.`,
            metadata: { leadId, autoPush: true },
          },
        })
        // Re-fetch to return updated status
        const updated = await prisma.buildStatus.findUnique({ where: { leadId } })
        return NextResponse.json(updated)
      }
    }

    return NextResponse.json(buildStatus)
  } catch (error) {
    console.error('Error updating build status:', error)
    return NextResponse.json({ error: 'Failed to update build status' }, { status: 500 })
  }
}
