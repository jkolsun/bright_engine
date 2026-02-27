import { prisma } from '@/lib/db'
import PreviewTemplate from '@/components/preview/PreviewTemplate'
import PreviewTracker from '@/components/preview/PreviewTracker'
import PreviewCTABanner from '@/components/preview/PreviewCTABanner'
import { notFound } from 'next/navigation'
import { STATIC_PAGE_ROUTER_SCRIPT, getAccentCssTag } from '@/components/preview/shared/staticPageRouter'

// CRITICAL: Force dynamic rendering — client must always see the latest saved HTML
export const dynamic = 'force-dynamic'

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findFirst({
    where: {
      OR: [
        { previewId: params.id },
        { id: params.id }
      ]
    }
  })

  if (!lead) return notFound()

  // Serve custom HTML if it exists (edited in Site Editor)
  if (lead.siteHtml) {
    // Clean the HTML — strip any overlays, CTA banners, and placeholder text
    let cleanHtml = lead.siteHtml
    const colorPrefs = lead.colorPrefs as { primary?: string; accent?: string } | null
    const accentHex = colorPrefs?.accent || colorPrefs?.primary || undefined
    const accentTag = getAccentCssTag(accentHex)
    // Strip CTA "Get This Site Live" banner if it survived snapshot generation
    cleanHtml = cleanHtml.replace(/<div[^>]*class="[^"]*fixed bottom-0[^"]*bg-\[#0D7377\][^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g, '')
    // Strip any raw AI placeholder labels
    cleanHtml = cleanHtml.replace(/\bABOUT_P[0-9]:\s*/gi, '')
    cleanHtml = cleanHtml.replace(/\bVP[0-9]_(TITLE|DESC)\b:?\s*/gi, '')

    // Inject noindex + tracking script + overlay cleanup into the HTML
    const previewId = lead.previewId || params.id
    const noindex = '<meta name="robots" content="noindex, nofollow">'
    const trackScript = `<script>fetch('/api/preview/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({previewId:'${previewId}',event:'page_view'})})</script>`
    const killOverlay = `<style>.fixed.inset-0[class*="z-[9999"]{display:none!important}.fixed.bottom-0[class*="bg-\\[#0D7377"]{display:none!important}</style><script>document.querySelectorAll('div').forEach(function(e){if(e.className&&(e.className.indexOf('z-[9999]')!==-1||(e.className.indexOf('fixed')!==-1&&e.className.indexOf('bg-[#0D7377')!==-1)))e.remove()})</script>`

    // Inject into <head> if it exists, otherwise prepend
    if (/<head[^>]*>/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/<head([^>]*)>/i, `<head$1>${noindex}${killOverlay}`)
    } else {
      cleanHtml = `${noindex}${killOverlay}${cleanHtml}`
    }
    // Ensure the static page router is present (handles navigation, CTAs, hamburger menu)
    if (cleanHtml.indexOf('sp-mobile-overlay') === -1) {
      if (/<\/body>/i.test(cleanHtml)) {
        cleanHtml = cleanHtml.replace(/<\/body>/i, `${accentTag}${STATIC_PAGE_ROUTER_SCRIPT}\n</body>`)
      } else {
        cleanHtml += accentTag + STATIC_PAGE_ROUTER_SCRIPT
      }
    }

    // Append tracking script before </body> or at end
    if (/<\/body>/i.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/<\/body>/i, `${trackScript}</body>`)
    } else {
      cleanHtml += trackScript
    }

    // Serve inside a sandboxed iframe to prevent XSS from siteHtml accessing parent cookies/session
    return (
      <html lang="en">
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
        <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
          <iframe
            srcDoc={cleanHtml}
            sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ width: '100%', height: '100vh', border: 'none' }}
            title={`Preview for ${lead.companyName}`}
          />
        </body>
      </html>
    )
  }

  // Parse personalization if stored as JSON string
  let personalization: any = {}
  try {
    if (typeof lead.personalization === 'string') {
      personalization = JSON.parse(lead.personalization)
    }
  } catch { personalization = {} }

  // Parse enriched data
  const services = Array.isArray(lead.enrichedServices) ? (lead.enrichedServices as string[]) : []
  const photos = Array.isArray(lead.enrichedPhotos) ? (lead.enrichedPhotos as string[]) : []

  return (
    <html lang="en">
      <head>
        <title>{lead.companyName} | Professional Services</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `.preview-template { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; } .preview-template h1, .preview-template h2, .preview-template h3, .preview-template .font-display { font-family: 'DM Serif Display', Georgia, serif; }` }} />
      </head>
      <body>
        <PreviewTracker
          previewId={lead.previewId || params.id}
        />
        <div className="pb-16">
        <PreviewTemplate
          lead={{
            companyName: lead.companyName,
            industry: lead.industry,
            city: lead.city || '',
            state: lead.state || '',
            phone: lead.phone || '',
            email: lead.email || '',
            website: lead.website || '',
            previewId: lead.previewId || params.id,
            enrichedRating: lead.enrichedRating || undefined,
            enrichedReviews: lead.enrichedReviews || undefined,
            enrichedAddress: lead.enrichedAddress || undefined,
            enrichedServices: services,
            enrichedPhotos: photos,
            logo: lead.logo || undefined,
            colorPrefs: lead.colorPrefs ? (lead.colorPrefs as any) : undefined,
          }}
          websiteCopy={personalization?.websiteCopy || undefined}
        />
        </div>
        {/* Only show CTA banner for first-stage previews — hide once site is approved/edited/live */}
        {!['QA_APPROVED', 'CLIENT_APPROVED', 'LAUNCHING', 'LIVE'].includes(lead.buildStep || '') && (
          <PreviewCTABanner previewId={lead.previewId || params.id} />
        )}
      </body>
    </html>
  )
}