'use client';

interface Testimonial {
  quote: string;
  name: string;
}

interface Step7Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step7Testimonial({ data, onChange }: Step7Props) {
  // Initialize from testimonials array or legacy single fields
  const testimonials: Testimonial[] =
    Array.isArray(data.testimonials) && data.testimonials.length > 0
      ? data.testimonials
      : data.testimonialQuote
        ? [{ quote: data.testimonialQuote, name: data.testimonialName || '' }]
        : [{ quote: '', name: '' }];

  const updateTestimonials = (updated: Testimonial[]) => {
    onChange({
      testimonials: updated,
      // Backward compat: always populate single fields from first entry
      testimonialQuote: updated[0]?.quote || '',
      testimonialName: updated[0]?.name || '',
    });
  };

  const updateTestimonial = (index: number, field: keyof Testimonial, value: string) => {
    const updated = testimonials.map((t, i) =>
      i === index ? { ...t, [field]: value } : t
    );
    updateTestimonials(updated);
  };

  const addTestimonial = () => {
    if (testimonials.length >= 5) return;
    updateTestimonials([...testimonials, { quote: '', name: '' }]);
  };

  const removeTestimonial = (index: number) => {
    if (testimonials.length <= 1) return;
    const updated = testimonials.filter((_, i) => i !== index);
    updateTestimonials(updated);
  };

  const lastQuoteEmpty = !testimonials[testimonials.length - 1]?.quote?.trim();

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Customer Testimonials
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Share quotes from happy customers. Social proof goes a long way in building trust.
      </p>

      <div className="space-y-5">
        {testimonials.map((testimonial, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Testimonial {index + 1}
              </span>
              {testimonials.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTestimonial(index)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Quote */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Quote
              </label>
              <textarea
                rows={4}
                value={testimonial.quote}
                onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                placeholder={`"They showed up on time, kept the site clean, and the finished roof looks amazing!"`}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                           resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                           transition-colors text-sm"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reviewer Name
              </label>
              <input
                type="text"
                value={testimonial.name}
                onChange={(e) => updateTestimonial(index, 'name', e.target.value)}
                placeholder="e.g. John D."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                           focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                           transition-colors text-sm"
              />
            </div>
          </div>
        ))}

        {/* Add Another */}
        {testimonials.length < 5 && (
          <button
            type="button"
            onClick={addTestimonial}
            disabled={lastQuoteEmpty}
            className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium
                       text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-300 disabled:hover:text-gray-500"
          >
            + Add Another Testimonial
          </button>
        )}

        {/* Preview */}
        {testimonials.some((t) => t.quote.trim()) && (
          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-3">
              Preview
            </p>
            <div className="space-y-4">
              {testimonials
                .filter((t) => t.quote.trim())
                .map((t, i) => (
                  <div key={i} className={i > 0 ? 'pt-3 border-t border-gray-200' : ''}>
                    <blockquote className="text-gray-700 italic text-sm leading-relaxed">
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
          </div>
        )}
      </div>
    </div>
  );
}
