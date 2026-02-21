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
      select: {
        id: true,
        previewId: true,
        siteHtml: true,
        companyName: true,
        personalization: true,
        buildReadinessScore: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Return cached if already exists
    if (lead.siteHtml) {
      return NextResponse.json({ html: lead.siteHtml, cached: true })
    }

    // Check if personalization exists — without it the preview will be bare
    let hasPersonalization = false
    if (lead.personalization) {
      try {
        const parsed = typeof lead.personalization === 'string'
          ? JSON.parse(lead.personalization)
          : lead.personalization
        hasPersonalization = !!parsed?.websiteCopy?.heroHeadline
      } catch { /* not valid JSON */ }
    }

    if (!hasPersonalization) {
      return NextResponse.json({
        error: `Site not ready for editing yet. The AI hasn't generated the website copy. Score: ${lead.buildReadinessScore || 0}/100. Use "Rebuild" to trigger the pipeline.`,
        needsRebuild: true,
      }, { status: 422 })
    }

    // Build URL to fetch the preview page
    // Use NEXT_PUBLIC_APP_URL (reliable on Railway) → fall back to request origin
    const previewPath = `/preview/${lead.previewId || id}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const previewUrl = `${baseUrl}${previewPath}`

    let previewRes: Response
    try {
      previewRes = await fetch(previewUrl, {
        headers: { 'Cookie': request.headers.get('cookie') || '' },
        signal: AbortSignal.timeout(15000),
      })
    } catch (fetchError) {
      console.error('[Snapshot] Fetch error:', fetchError)
      // Retry once with request origin if env URL failed
      const fallbackUrl = `${request.nextUrl.origin}${previewPath}`
      if (fallbackUrl !== previewUrl) {
        try {
          console.log('[Snapshot] Retrying with request origin...')
          previewRes = await fetch(fallbackUrl, {
            headers: { 'Cookie': request.headers.get('cookie') || '' },
            signal: AbortSignal.timeout(15000),
          })
        } catch (retryError) {
          console.error('[Snapshot] Retry also failed:', retryError)
          return NextResponse.json(
            { error: `Could not reach preview page. Tried: ${previewUrl} and ${fallbackUrl}` },
            { status: 502 }
          )
        }
      } else {
        return NextResponse.json(
          { error: `Could not reach preview page at ${previewUrl}. The server may still be deploying.` },
          { status: 502 }
        )
      }
    }

    if (!previewRes.ok) {
      const errorText = await previewRes.text().catch(() => 'Unknown error')
      console.error(`[Snapshot] Preview returned ${previewRes.status}:`, errorText.slice(0, 500))
      return NextResponse.json(
        { error: `Preview page returned ${previewRes.status}. Try again after the build finishes deploying.` },
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
