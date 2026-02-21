import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import OnboardingForm from '@/components/onboarding/OnboardingForm'

export const dynamic = 'force-dynamic'

export default async function OnboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = await prisma.lead.findUnique({
    where: { id },
    select: {
      id: true,
      companyName: true,
      phone: true,
      email: true,
      city: true,
      state: true,
      website: true,
      services: true,
      logo: true,
      photos: true,
      hours: true,
      colorPrefs: true,
      onboardingData: true,
      onboardingStep: true,
      onboardingStatus: true,
      qualificationData: true,
    },
  })

  if (!lead) {
    notFound()
  }

  // If already completed, show thank you page
  if (lead.onboardingStatus === 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            We received all your info and are building your website now.
            You&apos;ll get a text when it&apos;s ready for review.
          </p>
          <p className="text-sm text-gray-400">
            {lead.companyName}
          </p>
        </div>
      </div>
    )
  }

  // Merge existing lead data with onboardingData for pre-fill
  const existingQd = (lead.qualificationData && typeof lead.qualificationData === 'object')
    ? lead.qualificationData as Record<string, unknown>
    : {}

  const initialData = {
    companyName: lead.companyName || '',
    phone: lead.phone || '',
    email: lead.email || '',
    city: lead.city || '',
    state: lead.state || '',
    website: lead.website || '',
    services: Array.isArray(lead.services) ? lead.services : [],
    logo: lead.logo || '',
    photos: Array.isArray(lead.photos) ? lead.photos : [],
    aboutStory: existingQd.aboutStory || '',
    differentiator: existingQd.differentiator || '',
    yearsInBusiness: existingQd.yearsInBusiness || '',
    serviceArea: existingQd.serviceArea || '',
    testimonial: existingQd.testimonial || '',
    reviewerName: existingQd.reviewerName || '',
    certifications: existingQd.certifications || '',
    testimonials: (existingQd.testimonials as any[]) || [],
    hours: lead.hours || null,
    colorPrefs: lead.colorPrefs || null,
    socialFacebook: (existingQd.socialMedia as any)?.facebook || '',
    socialInstagram: (existingQd.socialMedia as any)?.instagram || '',
    socialGoogle: (existingQd.socialMedia as any)?.google || '',
    // Override with saved onboarding data (most recent)
    ...(lead.onboardingData && typeof lead.onboardingData === 'object'
      ? lead.onboardingData as Record<string, unknown>
      : {}),
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Let&apos;s Build Your Website
          </h1>
          <p className="text-gray-500 mt-2">
            {lead.companyName ? `${lead.companyName} — ` : ''}Fill out the info below and we&apos;ll create your site.
          </p>
        </div>

        <OnboardingForm
          leadId={lead.id}
          initialData={initialData}
          initialStep={lead.onboardingStep || 0}
        />
      </div>
    </div>
  )
}
