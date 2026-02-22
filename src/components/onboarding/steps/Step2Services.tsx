'use client';

import { useState } from 'react';

interface Step2Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step2Services({ data, onChange }: Step2Props) {
  const [customInput, setCustomInput] = useState('');
  const services: string[] = data.services || [];

  const addService = () => {
    const trimmed = customInput.trim();
    if (trimmed && !services.includes(trimmed)) {
      onChange({ services: [...services, trimmed] });
    }
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addService();
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
        Type each service your company offers and press Enter or click Add.
        <span className="block text-xs text-amber-600 mt-1">At least 2 services required <span className="text-red-500">*</span></span>
      </p>

      {/* Service Input */}
      <div className="mb-6">
        <label
          htmlFor="serviceInput"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Add a Service
        </label>
        <div className="flex gap-2">
          <input
            id="serviceInput"
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Roofing, Siding, Painting..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
          <button
            type="button"
            onClick={addService}
            disabled={!customInput.trim()}
            className="px-4 py-3 rounded-lg bg-blue-600 text-white font-medium text-sm
                       hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
                       transition-colors"
          >
            Add
          </button>
        </div>
        <p className="mt-1.5 text-xs text-gray-400">
          Press Enter or click Add for each service
        </p>
      </div>

      {/* Selected Services Tags */}
      {services.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Your Services ({services.length})
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
