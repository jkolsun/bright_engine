'use client';

interface Step4Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step4AboutStory({ data, onChange }: Step4Props) {
  const story: string = data.aboutStory || '';
  const charCount = story.length;
  const isTooShort = charCount > 0 && charCount < 10;

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Your Story
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Tell us about your company. How did you get started? What drives your team?
      </p>

      <div>
        <label
          htmlFor="aboutStory"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          About Your Business
        </label>
        <textarea
          id="aboutStory"
          rows={7}
          value={story}
          onChange={(e) => onChange({ aboutStory: e.target.value })}
          placeholder="We started our company in 2005 with a simple mission: to deliver quality craftsmanship at a fair price. Over the years, our family-owned business has grown..."
          className={`w-full rounded-lg border px-4 py-3 text-gray-900 placeholder-gray-400
                     resize-y focus:ring-2 focus:outline-none transition-colors
                     ${
                       isTooShort
                         ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20'
                         : 'border-gray-300 focus:border-blue-600 focus:ring-blue-600/20'
                     }`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          {isTooShort ? (
            <p className="text-xs text-amber-600">
              Please write at least 10 characters ({10 - charCount} more needed)
            </p>
          ) : (
            <p className="text-xs text-gray-400">
              Share your company story &mdash; this helps build trust with your customers.
            </p>
          )}
          <p
            className={`text-xs ${
              isTooShort ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            {charCount} character{charCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
