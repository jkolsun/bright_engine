'use client';

import { useRef, useState } from 'react';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/svg+xml';

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
      // Reset file input so the same file can be re-selected
      if (fileRef.current) {
        fileRef.current.value = '';
      }
    }
  };

  const removeLogo = () => {
    onChange({ logoUrl: null });
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Company Logo
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Upload your company logo. We will use it on your website and marketing materials.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Logo Image
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
    </div>
  );
}
