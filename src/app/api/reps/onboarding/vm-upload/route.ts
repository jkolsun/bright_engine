import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via session cookie
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId as string

    // 2. Parse FormData
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const type = formData.get('type') as string | null

    // 3. Validate inputs
    if (!type || (type !== 'outbound' && type !== 'inbound')) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "outbound" or "inbound".' },
        { status: 400 }
      )
    }

    if (!audio) {
      return NextResponse.json(
        { error: 'No audio file provided.' },
        { status: 400 }
      )
    }

    // 4. Convert file to Buffer
    const arrayBuffer = await audio.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 5. Upload to Cloudinary (resource_type 'video' handles audio in Cloudinary)
    const publicId = `rep-${userId}-${type}-${Date.now()}`

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'voicemail-recordings',
          public_id: publicId,
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )
      uploadStream.end(buffer)
    })

    const url = uploadResult.secure_url as string

    // 6. Save the Cloudinary URL to the User record
    const updateData =
      type === 'outbound'
        ? { outboundVmUrl: url, outboundVmApproved: false }
        : { inboundVmUrl: url, inboundVmApproved: false }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // 7. Get the user's name for the notification
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })
    const userName = user?.name || 'Unknown Rep'

    // 8. Create admin notification
    await prisma.notification.create({
      data: {
        type: 'DAILY_AUDIT',
        title: 'New Rep VM Recording',
        message: `${userName} uploaded their ${type} voicemail. Pending approval.`,
        metadata: { repId: userId, type, vmUrl: url },
      },
    })

    // 9. Return success
    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('[vm-upload] Upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
