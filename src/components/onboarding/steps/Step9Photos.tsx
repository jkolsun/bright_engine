'use client';

import { useRef, useState } from 'react';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';
const MAX_PHOTOS = 10;

interface Step9Props {
  data: Record<string, any>;
  onChange: (updates: Record<string, any>) => void;
  onUpload: (file: File) => Promise<string | null>;
}

export default function Step9Photos({ data, onChange, onUpload }: Step9Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photos: string[] = data.photos || [];
  const remaining = MAX_PHOTOS - photos.length;
  const isFull = remaining <= 0;

  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    const filesToUpload = Array.from(files).slice(0, remaining);
    const newUrls: string[] = [];

    try {
      for (const file of filesToUpload) {
        const url = await onUpload(file);
        if (url) {
          newUrls.push(url);
        }
      }

      if (newUrls.length > 0) {
        onChange({ photos: [...photos, ...newUrls] });
      }

      if (newUrls.length < filesToUpload.length) {
        setError(
          `${filesToUpload.length - newUrls.length} file(s) failed to upload.`
        );
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

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange({ photos: updated });
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">
        Project Photos
      </h2>
      <p className="text-gray-500 mb-6 text-sm">
        Upload photos of your best work. High-quality images help win more customers.
      </p>

      {/* Count indicator */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">
          Work Photos
        </label>
        <span
          className={`text-sm font-medium ${
            isFull ? 'text-amber-600' : 'text-gray-500'
          }`}
        >
          {photos.length}/{MAX_PHOTOS} photos uploaded
        </span>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {photos.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
            >
              <img
                src={url}
                alt={`Project photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white
                           flex items-center justify-center opacity-0 group-hover:opacity-100
                           transition-opacity hover:bg-black/80"
                aria-label={`Remove photo ${index + 1}`}
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
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {!isFull && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6
                     flex flex-col items-center justify-center gap-2
                     hover:border-blue-400 hover:bg-blue-50/50 transition-colors
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <svg
                className="w-7 h-7 text-blue-600 animate-spin"
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
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5
                     l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5
                     1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25
                     6v13.5A1.5 1.5 0 003.75 21z"
                />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                Click to upload photos
              </span>
              <span className="text-xs text-gray-400">
                JPEG, PNG, or WebP &middot; Up to {remaining} more
              </span>
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFilesSelect}
        className="hidden"
        aria-label="Upload project photos"
      />

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {isFull && (
        <p className="mt-2 text-sm text-amber-600">
          Maximum of {MAX_PHOTOS} photos reached. Remove a photo to upload a new one.
        </p>
      )}
    </div>
  );
}
