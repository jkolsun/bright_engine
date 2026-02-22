import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/site-editor/[id]/save
 * Loads lead data + siteHtml for the editor (on-demand, avoids bloating list APIs)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        buildStep: true,
        previewId: true,
        siteHtml: true,
        buildReadinessScore: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Strip DisclaimerBanner if it got baked into cached HTML (stuck without JS)
    let cleanHtml = lead.siteHtml || null
    if (cleanHtml) {
      const disclaimerRe = /<div[^>]*z-\[9999\][^>]*>[\s\S]*?View My Preview[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
      const stripped = cleanHtml.replace(disclaimerRe, '')
      if (stripped !== cleanHtml) {
        cleanHtml = stripped
        await prisma.lead.update({ where: { id }, data: { siteHtml: cleanHtml } })
      }
    }

    return NextResponse.json({
      leadId: lead.id,
      companyName: lead.companyName,
      buildStep: lead.buildStep,
      previewId: lead.previewId,
      hasHtml: !!cleanHtml,
      html: cleanHtml,
    })
  } catch (error) {
    console.error('[Site Editor Load] Error:', error)
    return NextResponse.json({ error: 'Failed to load editor data' }, { status: 500 })
  }
}

/**
 * PUT /api/site-editor/[id]/save
 * Saves edited HTML to lead.siteHtml
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { id } = await context.params
    const { html } = await request.json()

    if (typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML content required' }, { status: 400 })
    }

    // Size guard (max 2MB)
    if (html.length > 2_000_000) {
      return NextResponse.json({ error: 'HTML too large (max 2MB)' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, buildStep: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        siteHtml: html,
        buildStep: lead.buildStep === 'QA_REVIEW' ? 'EDITING' : lead.buildStep,
      },
      select: { id: true, siteHtml: true },
    })

    // Verify the save actually committed — if siteHtml length doesn't match, something went wrong
    if (!updated.siteHtml || (html.length > 0 && Math.abs(updated.siteHtml.length - html.length) > 10)) {
      console.error(`[Save] Verification failed: sent ${html.length} chars, got back ${updated.siteHtml?.length ?? 0} chars`)
      return NextResponse.json({ error: 'Save verification failed — please try again' }, { status: 500 })
    }

    return NextResponse.json({ success: true, savedAt: new Date().toISOString(), size: updated.siteHtml.length })
  } catch (error) {
    console.error('[Save] Error:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
