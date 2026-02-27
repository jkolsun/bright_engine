import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { STATIC_PAGE_ROUTER_SCRIPT, getAccentCssTag, stripOldRouter } from '@/components/preview/shared/staticPageRouter'

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
        colorPrefs: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check for force-regenerate flag (default: use cache)
    const body = await request.json().catch(() => ({}))
    const forceRegenerate = body?.force === true

    if (lead.siteHtml && !forceRegenerate) {
      // Strip DisclaimerBanner if it got baked in — it's stuck without JS click handlers
      const disclaimerRe = /<div[^>]*z-\[9999\][^>]*>[\s\S]*?View My Preview[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g
      const cleanHtml = lead.siteHtml.replace(disclaimerRe, '')
      if (cleanHtml !== lead.siteHtml) {
        await prisma.lead.update({ where: { id }, data: { siteHtml: cleanHtml } })
      }
      return NextResponse.json({ html: cleanHtml, cached: true })
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

    // Post-process: add Tailwind CDN + Google Fonts + font config, strip Next.js scripts
    const tailwindCdn = '<script src="https://cdn.tailwindcss.com"></script>'
    const tailwindConfig = `<script>tailwind.config={theme:{extend:{fontFamily:{display:['"DM Serif Display"','Georgia','serif']}}}}</script>`
    const googleFonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">'
    const baseFontCss = `<style>body,.preview-template{font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif}h1,h2,h3,h4,.preview-template h1,.preview-template h2,.preview-template h3,.preview-template h4,.font-display{font-family:'DM Serif Display',Georgia,serif}</style>`
    const metaCharset = '<meta charset="UTF-8">'

    // Inject into <head>
    html = html.replace(
      /<head[^>]*>/i,
      `<head>\n  ${metaCharset}\n  ${tailwindCdn}\n  ${tailwindConfig}\n  ${googleFonts}\n  ${baseFontCss}`
    )

    // Strip Next.js scripts (/_next/ references, __NEXT_DATA__, hydration scripts)
    html = html.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g, '')
    html = html.replace(/<script[^>]*id="__NEXT_DATA__"[^>]*>[\s\S]*?<\/script>/g, '')
    html = html.replace(/<script[^>]*>\s*self\.__next[\s\S]*?<\/script>/g, '')
    html = html.replace(/<link[^>]*href="\/_next\/[^"]*"[^>]*\/?>/g, '')

    // Strip DisclaimerBanner overlay — becomes permanently stuck without JS click handlers
    html = html.replace(/<div[^>]*z-\[9999\][^>]*>[\s\S]*?View My Preview[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '')
    // Failsafe: kill stuck overlays + force all ScrollReveal sections visible (they start at opacity:0)
    const snapshotFixes = [
      '<style>.fixed.inset-0[class*="z-[9999"]{display:none!important}</style>',
      '<script>document.querySelectorAll("div").forEach(function(e){if(e.className&&e.className.indexOf("z-[9999]")!==-1)e.remove()})</script>',
      '<style>[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important;transform:none!important}</style>',
    ].join('\n')
    html = html.replace(/<\/head>/i, `${snapshotFixes}\n</head>`)

    // Strip the CTA banner — the approved/edited site shouldn't show "Get This Site Live"
    html = html.replace(/<div[^>]*class="[^"]*fixed bottom-0[^"]*bg-\[#0D7377\][^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '')
    // Also strip the bottom padding wrapper that accommodates the banner
    html = html.replace(/<div class="pb-16">([\s\S]*?)<\/div>\s*$/m, '$1')

    // Strip the "Change Style" / TemplateSwitcher button (shouldn't appear on final site)
    html = html.replace(/<div[^>]*style="[^"]*position:\s*fixed[^"]*z-index:\s*60[^"]*"[^>]*>[\s\S]*?Change Style[\s\S]*?<\/div>/gi, '')
    html = html.replace(/<div style="position: ?fixed; ?bottom: ?80[^"]*; ?left: ?16[^"]*; ?z-index: ?60[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '')

    // Clean up any raw AI placeholder labels that leaked through (ABOUT_P1:, VP1_DESC, etc.)
    html = html.replace(/\bABOUT_P[0-9]:\s*/gi, '')
    html = html.replace(/\bVP[0-9]_(TITLE|DESC)\b:?\s*/gi, '')
    html = html.replace(/\bHERO_(HEADLINE|SUBHEADLINE)\b:?\s*/gi, '')
    html = html.replace(/\bCLOSING_(HEADLINE|BODY)\b:?\s*/gi, '')
    html = html.replace(/\bTESTIMONIAL_(QUOTE|AUTHOR)\b:?\s*/gi, '')
    html = html.replace(/\bSVC_[A-Z0-9_]+\b:?\s*/gi, '')
    html = html.replace(/\bYEARS_BADGE\b:?\s*/gi, '')
    html = html.replace(/\bSERVICE_AREA_TEXT\b:?\s*/gi, '')

    // Strip any old router that may have been baked in, then inject fresh version
    const colorPrefs = lead.colorPrefs as { primary?: string; accent?: string } | null
    const accentHex = colorPrefs?.accent || colorPrefs?.primary || undefined
    const accentTag = getAccentCssTag(accentHex)
    html = stripOldRouter(html)
    html = html.replace(/<\/body>/i, `${accentTag}${STATIC_PAGE_ROUTER_SCRIPT}\n</body>`)

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
