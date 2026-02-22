'use client';

import { useRef, useState } from 'react';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/svg+xml';

const DEFAULT_COLORS = { primary: '#2563EB', secondary: '#1E40AF', accent: '#F59E0B' };
const MAX_EXTRA_COLORS = 3;

interface ExtraColor {
  label: string;
  hex: string;
}

interface Step8Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  onUpload: (file: File) => Promise<string | null>;
}

export default function Step8Logo({ data, onChange, onUpload }: Step8Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoUrl: string | null = data.logoUrl || null;
  const colors = data.colorPrefs || DEFAULT_COLORS;
  const extraColors: ExtraColor[] = colors.extra || [];
  const hasAccent = colors.accent !== undefined && colors.accent !== null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const url = await onUpload(file);
      if (url) {
        onChange({ logoUrl: url });
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong during upload.');
    } finally {
      setUploading(false);
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    onChange({ logoUrl: null });
  };

  const updateColor = (key: string, value: string) => {
    onChange({ colorPrefs: { ...colors, [key]: value } });
  };

  const removeAccent = () => {
    const { accent: _, ...rest } = colors;
    onChange({ colorPrefs: rest });
  };

  const addAccent = () => {
    onChange({ colorPrefs: { ...colors, accent: '#F59E0B' } });
  };

  const addExtraColor = () => {
    if (extraColors.length >= MAX_EXTRA_COLORS) return;
    const newExtra = [...extraColors, { label: `Color ${extraColors.length + 1}`, hex: '#6B7280' }];
    onChange({ colorPrefs: { ...colors, extra: newExtra } });
  };

  const updateExtraColor = (index: number, field: 'label' | 'hex', value: string) => {
    const newExtra = [...extraColors];
    newExtra[index] = { ...newExtra[index], [field]: value };
    onChange({ colorPrefs: { ...colors, extra: newExtra } });
  };

  const removeExtraColor = (index: number) => {
    const newExtra = extraColors.filter((_, i) => i !== index);
    onChange({ colorPrefs: { ...colors, extra: newExtra.length > 0 ? newExtra : undefined } });
  };

  const totalColors = 2 + (hasAccent ? 1 : 0) + extraColors.length;
  const canAddMore = totalColors < 6;

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Logo &amp; Brand Colors
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Upload your company logo and choose your brand colors for the website.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo Image <span className="text-red-500">*</span>
        </label>

        {/* Upload Area */}
        {!logoUrl ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8
                       flex flex-col items-center justify-center gap-3
                       hover:border-blue-400 hover:bg-blue-50/50 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <svg
                  className="w-8 h-8 text-blue-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm text-gray-500">Uploading...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-10 h-10 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775
                       5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0
                       0118 19.5H6.75z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-600">
                  Click to upload your logo
                </span>
                <span className="text-xs text-gray-400">
                  JPEG, PNG, WebP, or SVG
                </span>
              </>
            )}
          </button>
        ) : (
          /* Logo Preview */
          <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4 flex flex-col items-center gap-3">
            <img
              src={logoUrl}
              alt="Company logo preview"
              className="max-h-32 max-w-full object-contain rounded"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium
                           text-gray-700 hover:bg-gray-50 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={removeLogo}
                className="px-4 py-2 rounded-lg border border-red-200 bg-white text-sm font-medium
                           text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload logo file"
        />

        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Brand Colors */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <p className="text-sm font-medium text-gray-700 mb-1">Brand Colors</p>
        <p className="text-xs text-gray-400 mb-4">
          Pick your brand colors. Primary and Secondary are required. Add more to customize further.
        </p>

        <div className="space-y-3">
          {/* Primary — always required */}
          <ColorRow
            label="Primary Color"
            required
            value={colors.primary || DEFAULT_COLORS.primary}
            onChange={(v) => updateColor('primary', v)}
          />

          {/* Secondary — always required */}
          <ColorRow
            label="Secondary Color"
            required
            value={colors.secondary || DEFAULT_COLORS.secondary}
            onChange={(v) => updateColor('secondary', v)}
          />

          {/* Accent — shown by default, removable */}
          {hasAccent ? (
            <ColorRow
              label="Accent Color"
              value={colors.accent}
              onChange={(v) => updateColor('accent', v)}
              onRemove={removeAccent}
            />
          ) : (
            <button
              type="button"
              onClick={addAccent}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              <span className="w-5 h-5 rounded border border-dashed border-blue-400 flex items-center justify-center text-blue-400">+</span>
              Add Accent Color
            </button>
          )}

          {/* Extra colors */}
          {extraColors.map((ec, i) => (
            <div key={i} className="flex items-center gap-3">
              <input
                type="color"
                value={ec.hex}
                onChange={(e) => updateExtraColor(i, 'hex', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={ec.label}
                  onChange={(e) => updateExtraColor(i, 'label', e.target.value)}
                  placeholder="Color name"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-700
                             focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 focus:outline-none mb-0.5"
                />
                <input
                  type="text"
                  value={ec.hex}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      updateExtraColor(i, 'hex', val);
                    }
                  }}
                  placeholder="#000000"
                  className="w-28 rounded border border-gray-300 px-2 py-1 text-sm font-mono text-gray-900
                             focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeExtraColor(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="Remove color"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add more button */}
          {canAddMore && (
            <button
              type="button"
              onClick={hasAccent ? addExtraColor : addAccent}
              className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              <span className="w-5 h-5 rounded border border-dashed border-blue-400 flex items-center justify-center text-blue-400">+</span>
              Add Color
            </button>
          )}
        </div>

        {/* Color Preview */}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Preview:</span>
          <div
            className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
            style={{ backgroundColor: colors.primary || DEFAULT_COLORS.primary }}
            title="Primary"
          />
          <div
            className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
            style={{ backgroundColor: colors.secondary || DEFAULT_COLORS.secondary }}
            title="Secondary"
          />
          {hasAccent && (
            <div
              className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: colors.accent }}
              title="Accent"
            />
          )}
          {extraColors.map((ec, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
              style={{ backgroundColor: ec.hex }}
              title={ec.label}
            />
          ))}
          <span className="text-[10px] text-gray-400 ml-1">
            {totalColors} color{totalColors !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Gradient preview */}
        <div className="mt-3 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-200">
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(to right, ${colors.primary || DEFAULT_COLORS.primary}, ${colors.secondary || DEFAULT_COLORS.secondary})`,
            }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Site gradient preview (primary to secondary)</p>
      </div>
    </div>
  );
}

/** Reusable color row for primary/secondary/accent */
function ColorRow({
  label,
  value,
  onChange,
  onRemove,
  required,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  onRemove?: () => void;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
      />
      <div className="flex-1">
        <label className="block text-xs text-gray-500 mb-0.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          placeholder="#000000"
          className="w-28 rounded border border-gray-300 px-2 py-1 text-sm font-mono text-gray-900
                     focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 focus:outline-none"
        />
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove color"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
