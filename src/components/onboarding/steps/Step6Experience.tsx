'use client';

interface Step6Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step6Experience({ data, onChange }: Step6Props) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Experience &amp; Credentials
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Share your experience and any certifications or licenses you hold.
      </p>

      <div className="space-y-4">
        {/* Years in Business */}
        <div>
          <label
            htmlFor="yearsInBusiness"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Years in Business
          </label>
          <input
            id="yearsInBusiness"
            type="number"
            min={0}
            max={200}
            value={data.yearsInBusiness ?? ''}
            onChange={(e) =>
              onChange({
                yearsInBusiness:
                  e.target.value === '' ? '' : Number(e.target.value),
              })
            }
            placeholder="e.g. 15"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            How long has your company been operating?
          </p>
        </div>

        {/* Certifications / Licenses */}
        <div>
          <label
            htmlFor="certifications"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Certifications &amp; Licenses
          </label>
          <input
            id="certifications"
            type="text"
            value={data.certifications || ''}
            onChange={(e) => onChange({ certifications: e.target.value })}
            placeholder="e.g. GAF Certified, EPA Lead-Safe, Licensed General Contractor"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
          <p className="mt-1.5 text-xs text-gray-400">
            Separate multiple certifications or licenses with a comma.
          </p>
        </div>
      </div>
    </div>
  );
}
