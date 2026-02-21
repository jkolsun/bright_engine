'use client';

interface Step7Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step7Testimonial({ data, onChange }: Step7Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Customer Testimonial
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Share a quote from a happy customer. Social proof goes a long way in building trust.
      </p>

      <div className="space-y-4">
        {/* Testimonial Quote */}
        <div>
          <label
            htmlFor="testimonialQuote"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Customer Quote
          </label>
          <textarea
            id="testimonialQuote"
            rows={5}
            value={data.testimonialQuote || ''}
            onChange={(e) => onChange({ testimonialQuote: e.target.value })}
            placeholder={`"They showed up on time, kept the site clean, and the finished roof looks amazing. Best contractor we've ever hired!"`}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
        </div>

        {/* Reviewer Name */}
        <div>
          <label
            htmlFor="testimonialName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Reviewer Name
          </label>
          <input
            id="testimonialName"
            type="text"
            value={data.testimonialName || ''}
            onChange={(e) => onChange({ testimonialName: e.target.value })}
            placeholder="e.g. John D."
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            You can use a first name and last initial for privacy.
          </p>
        </div>

        {/* Preview Card */}
        {data.testimonialQuote && (
          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-2">
              Preview
            </p>
            <blockquote className="text-gray-700 italic text-sm leading-relaxed">
              &ldquo;{data.testimonialQuote}&rdquo;
            </blockquote>
            {data.testimonialName && (
              <p className="mt-2 text-sm font-medium text-gray-900">
                &mdash; {data.testimonialName}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
