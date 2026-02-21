/**
 * Media Processor
 *
 * Downloads images from Twilio (auth-protected URLs) and uploads them to
 * Cloudinary so they're publicly accessible. Used by the Twilio webhook
 * for inbound MMS and by the onboarding form for file uploads.
 */

import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Download an image from Twilio's auth-protected URL and upload to Cloudinary.
 * Returns the public Cloudinary URL.
 */
export async function processMediaFromTwilio(
  twilioUrl: string,
  contentType: string,
  leadId: string
): Promise<string | null> {
  try {
    // Download from Twilio with Basic Auth
    const accountSid = process.env.TWILIO_ACCOUNT_SID || ''
    const authToken = process.env.TWILIO_AUTH_TOKEN || ''
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

    const response = await fetch(twilioUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      console.error(`[MediaProcessor] Failed to download from Twilio: ${response.status}`)
      return null
    }

    // Convert to buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `bright-automations/leads/${leadId}`,
          resource_type: 'image',
          tags: [leadId, 'mms'],
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    console.log(`[MediaProcessor] Uploaded to Cloudinary: ${result.secure_url}`)
    return result.secure_url
  } catch (error) {
    console.error('[MediaProcessor] Failed to process Twilio media:', error)
    return null
  }
}

/**
 * Upload a file buffer directly to Cloudinary (for form uploads).
 * Returns the public Cloudinary URL.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  leadId: string,
  options?: { folder?: string; tags?: string[] }
): Promise<string | null> {
  try {
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options?.folder || `bright-automations/leads/${leadId}`,
          resource_type: 'image',
          tags: [leadId, ...(options?.tags || ['upload'])],
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    return result.secure_url
  } catch (error) {
    console.error('[MediaProcessor] Upload to Cloudinary failed:', error)
    return null
  }
}
