import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary } from '@/lib/media-processor'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow up to 30s for large file uploads to Cloudinary

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/onboard/[id]/upload
 * Handle file uploads for the onboarding form.
 * Accepts multipart/form-data with a single 'file' field.
 * Uploads to Cloudinary and returns the public URL.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Send a "file" field in multipart/form-data.' },
        { status: 400 }
      )
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 413 }
      )
    }

    // Convert file to Buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Cloudinary
    const url = await uploadToCloudinary(buffer, id, { tags: ['onboarding'] })

    if (!url) {
      return NextResponse.json(
        { error: 'Upload failed. Could not upload file to storage.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[Onboard Upload] Error:', error)
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
