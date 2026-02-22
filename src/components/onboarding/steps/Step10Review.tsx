'use client';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

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
  const testimonials = Array.isArray(data.testimonials) && data.testimonials.length > 0
    ? data.testimonials
    : data.testimonialQuote
      ? [{ quote: data.testimonialQuote, name: data.testimonialName || '' }]
      : [];
  const hours = data.hours;
  const colors = data.colorPrefs;

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
            <InfoRow label="Facebook" value={data.socialFacebook} />
            <InfoRow label="Instagram" value={data.socialInstagram} />
            <InfoRow label="Google Business" value={data.socialGoogle} />
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

        {/* Business Hours */}
        {hours && typeof hours === 'object' && (
          <SectionCard title="Business Hours">
            <div className="space-y-1">
              {DAYS.map((day) => {
                const dayData = hours[day];
                const isOpen = dayData && dayData !== 'closed';
                return (
                  <div key={day} className="flex justify-between py-0.5">
                    <span className="text-sm font-medium text-gray-700 w-12">
                      {DAY_LABELS[day]}
                    </span>
                    <span className={`text-sm ${isOpen ? 'text-gray-900' : 'text-gray-400 italic'}`}>
                      {isOpen ? `${dayData.open} - ${dayData.close}` : 'Closed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && testimonials.some((t: any) => t.quote?.trim()) && (
          <SectionCard title={`Customer Testimonial${testimonials.length > 1 ? 's' : ''}`}>
            <div className="space-y-3">
              {testimonials
                .filter((t: any) => t.quote?.trim())
                .map((t: any, i: number) => (
                  <div key={i} className={i > 0 ? 'pt-3 border-t border-gray-100' : ''}>
                    <blockquote className="text-sm text-gray-700 italic leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    {t.name && (
                      <p className="mt-1.5 text-sm font-medium text-gray-900">
                        &mdash; {t.name}
                      </p>
                    )}
                  </div>
                ))}
            </div>
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

        {/* Brand Colors */}
        {colors && (
          <SectionCard title="Brand Colors">
            <div className="flex gap-4 flex-wrap">
              {/* Primary & Secondary (always present) */}
              {[
                { key: 'primary', label: 'Primary' },
                { key: 'secondary', label: 'Secondary' },
                ...(colors.accent ? [{ key: 'accent', label: 'Accent' }] : []),
              ].map(({ key, label }) => (
                colors[key] ? (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full border border-gray-200 shadow-sm"
                      style={{ backgroundColor: colors[key] }}
                    />
                    <div>
                      <span className="text-xs text-gray-500 block">{label}</span>
                      <span className="text-xs font-mono text-gray-700">{colors[key]}</span>
                    </div>
                  </div>
                ) : null
              ))}
              {/* Extra colors */}
              {Array.isArray(colors.extra) && colors.extra.map((ec: { label: string; hex: string }, i: number) => (
                <div key={`extra-${i}`} className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: ec.hex }}
                  />
                  <div>
                    <span className="text-xs text-gray-500 block">{ec.label}</span>
                    <span className="text-xs font-mono text-gray-700">{ec.hex}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Gradient preview */}
            {colors.primary && colors.secondary && (
              <div className="mt-3 h-6 rounded-lg overflow-hidden border border-gray-200">
                <div className="w-full h-full" style={{ background: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})` }} />
              </div>
            )}
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
