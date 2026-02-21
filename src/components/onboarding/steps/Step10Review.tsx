'use client';

interface Step10Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 py-1">
      <span className="text-xs font-medium text-gray-500 sm:w-36 flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-900 break-words">{value}</span>
    </div>
  );
}

export default function Step10Review({
  data,
  onChange,
  onSubmit,
  submitting,
}: Step10Props) {
  const services: string[] = data.services || [];
  const photos: string[] = data.photos || [];

  const handleSubmit = async () => {
    await onSubmit();
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Review &amp; Submit
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Please review your information below. Once everything looks good, hit submit.
      </p>

      <div className="space-y-4">
        {/* Business Info */}
        <SectionCard title="Business Information">
          <div className="divide-y divide-gray-100">
            <InfoRow label="Company Name" value={data.companyName} />
            <InfoRow label="Phone" value={data.phone} />
            <InfoRow label="Email" value={data.email} />
            <InfoRow
              label="Location"
              value={
                [data.city, data.state].filter(Boolean).join(', ') || undefined
              }
            />
            <InfoRow label="Website" value={data.website} />
          </div>
        </SectionCard>

        {/* Services */}
        {services.length > 0 && (
          <SectionCard title="Services">
            <div className="flex flex-wrap gap-1.5">
              {services.map((service) => (
                <span
                  key={service}
                  className="inline-block px-2.5 py-1 rounded-full bg-blue-50 text-blue-700
                             text-xs font-medium border border-blue-200"
                >
                  {service}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Service Area */}
        {data.serviceArea && (
          <SectionCard title="Service Area">
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {data.serviceArea}
            </p>
          </SectionCard>
        )}

        {/* Story */}
        {data.aboutStory && (
          <SectionCard title="Your Story">
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {data.aboutStory}
            </p>
          </SectionCard>
        )}

        {/* Differentiator */}
        {data.differentiator && (
          <SectionCard title="What Makes You Different">
            <p className="text-sm text-gray-900 whitespace-pre-line">
              {data.differentiator}
            </p>
          </SectionCard>
        )}

        {/* Experience */}
        {(data.yearsInBusiness || data.certifications) && (
          <SectionCard title="Experience & Credentials">
            <div className="divide-y divide-gray-100">
              <InfoRow
                label="Years in Business"
                value={
                  data.yearsInBusiness !== undefined && data.yearsInBusiness !== ''
                    ? `${data.yearsInBusiness} year${data.yearsInBusiness === 1 ? '' : 's'}`
                    : undefined
                }
              />
              <InfoRow label="Certifications" value={data.certifications} />
            </div>
          </SectionCard>
        )}

        {/* Testimonial */}
        {data.testimonialQuote && (
          <SectionCard title="Customer Testimonial">
            <blockquote className="text-sm text-gray-700 italic leading-relaxed">
              &ldquo;{data.testimonialQuote}&rdquo;
            </blockquote>
            {data.testimonialName && (
              <p className="mt-2 text-sm font-medium text-gray-900">
                &mdash; {data.testimonialName}
              </p>
            )}
          </SectionCard>
        )}

        {/* Logo */}
        {data.logoUrl && (
          <SectionCard title="Company Logo">
            <div className="flex justify-center">
              <img
                src={data.logoUrl}
                alt="Company logo"
                className="max-h-24 max-w-full object-contain rounded"
              />
            </div>
          </SectionCard>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <SectionCard title={`Project Photos (${photos.length})`}>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
                >
                  <img
                    src={url}
                    alt={`Project photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Submit Button */}
      <div className="mt-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 px-6 rounded-lg bg-blue-600 text-white font-semibold text-base
                     hover:bg-blue-700 focus:ring-4 focus:ring-blue-600/20 focus:outline-none
                     disabled:bg-blue-400 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Onboarding'
          )}
        </button>
      </div>
    </div>
  );
}
