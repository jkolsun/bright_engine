import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// PUT /api/folders/[id] — Rename or recolor a folder
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { name, color } = await request.json()
    const data: any = {}
    if (name?.trim()) data.name = name.trim()
    if (color) data.color = color

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const folder = await prisma.leadFolder.update({
      where: { id },
      data,
    })

    return NextResponse.json({ folder })
  } catch (error) {
    console.error('Folder update error:', error)
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 })
  }
}

// DELETE /api/folders/[id] — Delete a folder (leads become unfoldered)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    // Unfolder all leads in this folder first
    await prisma.lead.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })

    await prisma.leadFolder.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: 'Folder deleted' })
  } catch (error) {
    console.error('Folder delete error:', error)
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 })
  }
}
