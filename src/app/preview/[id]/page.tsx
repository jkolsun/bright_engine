import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PreviewTemplate from '@/components/preview/PreviewTemplate'
import PreviewTracker from '@/components/preview/PreviewTracker'

export default async function PreviewPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { previewId: params.id },
  })

  if (!lead) {
    notFound()
  }

  // Check if expired
  const isExpired = lead.previewExpiresAt && new Date() > lead.previewExpiresAt

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Expired</h1>
          <p className="text-gray-600 mb-6">
            This preview for {lead.companyName} has expired. 
            Please contact us to generate a new one.
          </p>
          <a 
            href={`tel:${process.env.TWILIO_PHONE_NUMBER}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
          >
            Call Us
          </a>
        </div>
      </div>
    )
  }

  // Log view
  await prisma.leadEvent.create({
    data: {
      leadId: lead.id,
      eventType: 'PREVIEW_VIEWED',
      actor: 'client',
    }
  })

  // Update to HOT if not already
  if (lead.priority !== 'HOT') {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { priority: 'HOT', status: 'HOT_LEAD' }
    })
  }

  return (
    <>
      <PreviewTracker previewId={lead.previewId!} />
      <PreviewTemplate lead={lead} />
    </>
  )
}
