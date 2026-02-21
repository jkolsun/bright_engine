import { prisma } from '@/lib/db'
import PreviewTemplate from '@/components/preview/PreviewTemplate'
import PreviewTracker from '@/components/preview/PreviewTracker'
import PreviewCTABanner from '@/components/preview/PreviewCTABanner'
import { notFound } from 'next/navigation'

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
    const headMatch = lead.siteHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
    const bodyMatch = lead.siteHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    const headContent = headMatch?.[1] || ''
    const bodyContent = bodyMatch?.[1] || lead.siteHtml
    // Tracking script
    const trackScript = `<script>fetch('/api/preview/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({previewId:'${lead.previewId || params.id}',event:'page_view'})})</script>`
    // Kill the DisclaimerBanner overlay — CSS hides it instantly, script removes it from DOM
    const killOverlay = `<style>.fixed.inset-0[class*="z-[9999"]{display:none!important}</style><script>document.querySelectorAll('div').forEach(function(e){if(e.className&&e.className.indexOf('z-[9999]')!==-1)e.remove()})</script>`
    return (
      <html lang="en">
        <head dangerouslySetInnerHTML={{ __html: headContent + killOverlay }} />
        <body dangerouslySetInnerHTML={{ __html: bodyContent + trackScript }} />
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
          }}
          websiteCopy={personalization?.websiteCopy || undefined}
        />
        </div>
        <PreviewCTABanner previewId={lead.previewId || params.id} />
      </body>
    </html>
  )
}