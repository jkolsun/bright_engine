import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/settings/voicemail
 * Uploads the default fallback voicemail audio file.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File must be MP3 or WAV' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be under 10MB' }, { status: 400 })
    }

    // Store file in public directory
    const ext = file.type.includes('wav') ? 'wav' : 'mp3'
    const filename = `default-voicemail-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'voicemail')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(uploadDir, filename), buffer)

    const voicemailUrl = `/uploads/voicemail/${filename}`

    // Save to settings
    await prisma.settings.upsert({
      where: { key: 'defaultVoicemailUrl' },
      create: { key: 'defaultVoicemailUrl', value: voicemailUrl },
      update: { value: voicemailUrl },
    })

    return NextResponse.json({ success: true, url: voicemailUrl })
  } catch (error) {
    console.error('Voicemail upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload voicemail', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
