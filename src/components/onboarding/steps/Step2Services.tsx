'use client';

import { useState } from 'react';

const COMMON_SERVICES = [
  'Roofing',
  'Siding',
  'Gutters',
  'Painting',
  'Decks',
  'Windows',
  'Doors',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Landscaping',
  'Remodeling',
  'Concrete',
  'Fencing',
  'Flooring',
];

interface Step2Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step2Services({ data, onChange }: Step2Props) {
  const [customInput, setCustomInput] = useState('');
  const services: string[] = data.services || [];

  const toggleService = (service: string) => {
    const updated = services.includes(service)
      ? services.filter((s) => s !== service)
      : [...services, service];
    onChange({ services: updated });
  };

  const addCustomService = () => {
    const trimmed = customInput.trim();
    if (trimmed && !services.includes(trimmed)) {
      onChange({ services: [...services, trimmed] });
    }
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomService();
    }
  };

  const removeService = (service: string) => {
    onChange({ services: services.filter((s) => s !== service) });
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Services You Offer
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Select the services your company provides. You can also add custom services below.
      </p>

      {/* Common Services Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
        {COMMON_SERVICES.map((service) => {
          const isSelected = services.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors text-left
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center
                    ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-400'
                    }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                {service}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Service Input */}
      <div className="mb-6">
        <label
          htmlFor="customService"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Add a Custom Service
        </label>
        <div className="flex gap-2">
          <input
            id="customService"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Drywall Installation"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
          <button
            type="button"
            onClick={addCustomService}
            disabled={!customInput.trim()}
            className="px-4 py-3 rounded-lg bg-blue-600 text-white font-medium text-sm
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Selected Services Tags */}
      {services.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Selected Services ({services.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700
                           text-sm font-medium border border-blue-200"
              >
                {service}
                <button
                  type="button"
                  onClick={() => removeService(service)}
                  className="ml-0.5 text-blue-400 hover:text-blue-700 transition-colors"
                  aria-label={`Remove ${service}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
