import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/lead-contacts
 * Admin adds an alternate contact to a lead.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadId, type, value, label } = await request.json()

    if (!leadId || !type || !value || !label) {
      return NextResponse.json({ error: 'leadId, type, value, and label are required' }, { status: 400 })
    }

    if (!['PHONE', 'EMAIL'].includes(type)) {
      return NextResponse.json({ error: 'type must be "PHONE" or "EMAIL"' }, { status: 400 })
    }

    const trimmedValue = value.trim()

    // Check for duplicates
    const existing = await prisma.leadContact.findFirst({
      where: { leadId, value: trimmedValue },
    })

    if (existing) {
      return NextResponse.json({ error: 'This contact already exists for this lead' }, { status: 409 })
    }

    const contact = await prisma.leadContact.create({
      data: {
        leadId,
        type,
        value: trimmedValue,
        label,
        addedBy: 'admin',
      },
    })

    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'ALTERNATE_CONTACT_ADDED',
        actor: 'admin',
        metadata: {
          contactType: type,
          contactValue: trimmedValue,
          contactLabel: label,
          addedBy: 'admin',
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Admin add contact error:', error)
    return NextResponse.json(
      { error: 'Failed to add contact', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
