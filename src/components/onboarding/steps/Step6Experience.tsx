'use client';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const DEFAULT_HOURS: Record<string, any> = {
  monday: { open: '08:00', close: '17:00' },
  tuesday: { open: '08:00', close: '17:00' },
  wednesday: { open: '08:00', close: '17:00' },
  thursday: { open: '08:00', close: '17:00' },
  friday: { open: '08:00', close: '17:00' },
  saturday: 'closed',
  sunday: 'closed',
};

interface Step6Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step6Experience({ data, onChange }: Step6Props) {
  const hours: Record<string, any> = data.hours || DEFAULT_HOURS;

  const updateHours = (day: string, update: any) => {
    const updated = { ...hours, [day]: update };
    onChange({ hours: updated });
  };

  const toggleDay = (day: string) => {
    const current = hours[day];
    if (current === 'closed' || !current) {
      updateHours(day, { open: '08:00', close: '17:00' });
    } else {
      updateHours(day, 'closed');
    }
  };

  const updateTime = (day: string, field: 'open' | 'close', value: string) => {
    const current = hours[day];
    if (typeof current === 'object' && current !== null) {
      updateHours(day, { ...current, [field]: value });
    }
  };

  const copyToWeekdays = () => {
    const monday = hours.monday;
    if (!monday || monday === 'closed') return;
    const updated = { ...hours };
    for (const day of ['tuesday', 'wednesday', 'thursday', 'friday']) {
      updated[day] = { ...monday };
    }
    onChange({ hours: updated });
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Experience &amp; Hours
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Share your experience, credentials, and business hours.
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

        {/* Business Hours */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Business Hours</p>
            <button
              type="button"
              onClick={copyToWeekdays}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Copy Mon to all weekdays
            </button>
          </div>

          <div className="space-y-2">
            {DAYS.map((day) => {
              const dayData = hours[day];
              const isOpen = dayData && dayData !== 'closed';

              return (
                <div key={day} className="flex items-center gap-3 py-1.5">
                  {/* Day label */}
                  <span className="text-sm font-medium text-gray-700 w-20 flex-shrink-0">
                    {DAY_LABELS[day]}
                  </span>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                      isOpen ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        isOpen ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Time inputs or Closed label */}
                  {isOpen ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="time"
                        value={dayData.open || '08:00'}
                        onChange={(e) => updateTime(day, 'open', e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900
                                   focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 focus:outline-none"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="time"
                        value={dayData.close || '17:00'}
                        onChange={(e) => updateTime(day, 'close', e.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900
                                   focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
