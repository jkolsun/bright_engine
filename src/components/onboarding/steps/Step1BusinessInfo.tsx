'use client';

import { useState } from 'react';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
];

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

interface Step1Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
}

export default function Step1BusinessInfo({ data, onChange }: Step1Props) {
  const handleChange = (field: string, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Business Information
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Tell us about your company. Fields marked with * are required.
      </p>

      <div className="space-y-4">
        {/* Company Name */}
        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            id="companyName"
            type="text"
            required
            value={data.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="e.g. Smith Roofing & Remodeling"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
        </div>

        {/* City + State row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              City
            </label>
            <input
              id="city"
              type="text"
              value={data.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="e.g. Dallas"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                         focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                         transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="state"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              State
            </label>
            <select
              id="state"
              value={data.state || ''}
              onChange={(e) => handleChange('state', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 bg-white
                         focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                         transition-colors appearance-none"
            >
              <option value="">Select state</option>
              {US_STATES.map((abbr) => (
                <option key={abbr} value={abbr}>
                  {STATE_NAMES[abbr]} ({abbr})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Website */}
        <div>
          <label
            htmlFor="website"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Website
          </label>
          <input
            id="website"
            type="url"
            value={data.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://www.yourcompany.com"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none
                       transition-colors"
          />
        </div>

        {/* Social Media Links */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-3">Social Media Links</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="socialFacebook" className="block text-xs text-gray-500 mb-1">Facebook</label>
              <input
                id="socialFacebook"
                type="url"
                value={data.socialFacebook || ''}
                onChange={(e) => handleChange('socialFacebook', e.target.value)}
                placeholder="https://facebook.com/yourcompany"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm
                           focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="socialInstagram" className="block text-xs text-gray-500 mb-1">Instagram</label>
              <input
                id="socialInstagram"
                type="url"
                value={data.socialInstagram || ''}
                onChange={(e) => handleChange('socialInstagram', e.target.value)}
                placeholder="https://instagram.com/yourcompany"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm
                           focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label htmlFor="socialGoogle" className="block text-xs text-gray-500 mb-1">Google Business Profile</label>
              <input
                id="socialGoogle"
                type="url"
                value={data.socialGoogle || ''}
                onChange={(e) => handleChange('socialGoogle', e.target.value)}
                placeholder="https://business.google.com/..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 text-sm
                           focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
