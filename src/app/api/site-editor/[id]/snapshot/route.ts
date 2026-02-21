import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * POST /api/site-editor/[id]/snapshot
 * Generates an HTML snapshot by fetching the preview URL,
 * stripping Next.js scripts, and adding Tailwind CDN for standalone rendering.
 */
export async function POST(
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
      select: { id: true, previewId: true, siteHtml: true, companyName: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Return cached if already exists
    if (lead.siteHtml) {
      return NextResponse.json({ html: lead.siteHtml, cached: true })
    }

    // Build internal URL to fetch the preview page
    const previewPath = `/preview/${lead.previewId || id}`
    const baseUrl = request.nextUrl.origin
    const previewUrl = `${baseUrl}${previewPath}`

    const previewRes = await fetch(previewUrl, {
      headers: { 'Cookie': request.headers.get('cookie') || '' },
    })

    if (!previewRes.ok) {
      return NextResponse.json(
        { error: `Preview fetch failed: ${previewRes.status}` },
        { status: 500 }
      )
    }

    let html = await previewRes.text()

    // Post-process: add Tailwind CDN + Google Fonts, strip Next.js scripts
    const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>'
    const googleFonts = '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">'
    const metaCharset = '<meta charset="UTF-8">'

    // Inject into <head>
    html = html.replace(
      /<head[^>]*>/i,
      `<head>\n  ${metaCharset}\n  ${tailwindCdn}\n  ${googleFonts}`
    )

    // Strip Next.js scripts (/_next/ references, __NEXT_DATA__, hydration scripts)
    html = html.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g, '')
    html = html.replace(/<script[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/g, '')
    html = html.replace(/<script[^>]*>\s*self\.__next[\s\S]*?<\/script>/g, '')
    html = html.replace(/<link[^>]*href="\/_next\/[^"]*"[^>]*\/?>/g, '')

    // Store in database
    await prisma.lead.update({
      where: { id },
      data: { siteHtml: html },
    })

    return NextResponse.json({ html, cached: false })
  } catch (error) {
    console.error('[Snapshot] Error:', error)
    return NextResponse.json({ error: 'Failed to generate snapshot' }, { status: 500 })
  }
}
