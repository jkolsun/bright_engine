'use client';

interface Step3Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step3ServiceArea({ data, onChange }: Step3Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Service Area
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Let us know where your company operates so we can target the right customers.
      </p>

      <div>
        <label
          htmlFor="serviceArea"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Areas You Serve
        </label>
        <textarea
          id="serviceArea"
          rows={6}
          value={data.serviceArea || ''}
          onChange={(e) => onChange({ serviceArea: e.target.value })}
          placeholder={`e.g.\nDallas, TX\nFort Worth, TX\nTarrant County\nDFW Metroplex`}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                     resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                     transition-colors"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          List the cities, counties, or areas you serve. Separate each area with a new line or comma.
        </p>
      </div>
    </div>
  );
}
