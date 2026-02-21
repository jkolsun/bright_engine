'use client';

interface Step5Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step5Differentiator({ data, onChange }: Step5Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        What Makes You Different?
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        What sets you apart from your competitors? This helps us highlight your strengths.
      </p>

      <div>
        <label
          htmlFor="differentiator"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Your Competitive Advantage
        </label>
        <textarea
          id="differentiator"
          rows={6}
          value={data.differentiator || ''}
          onChange={(e) => onChange({ differentiator: e.target.value })}
          placeholder="e.g. We offer a lifetime warranty on all our work, use only premium materials, and have a dedicated project manager for every job. Our crew has been together for 10+ years."
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                     resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                     transition-colors"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          Think about warranties, materials, experience, certifications, customer service, or anything
          that makes your business stand out.
        </p>
      </div>
    </div>
  );
}
