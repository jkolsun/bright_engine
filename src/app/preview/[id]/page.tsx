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
          }}
          websiteCopy={personalization?.websiteCopy || undefined}
        />
        </div>
        <PreviewCTABanner previewId={lead.previewId || params.id} />
      </body>
    </html>
  )
}