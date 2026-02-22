export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const setting = await prisma.settings.findUnique({ where: { key: 'call_guide_content' } })

    return NextResponse.json({ content: setting?.value ?? null })
  } catch (error) {
    console.error('[Admin Call Guide API] GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { content } = await request.json()

    await prisma.settings.upsert({
      where: { key: 'call_guide_content' },
      create: { key: 'call_guide_content', value: content },
      update: { value: content },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Call Guide API] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
