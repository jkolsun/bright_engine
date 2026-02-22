import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/dialer/add-contact
 * Adds an alternate contact (phone or email) to a lead.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || !['ADMIN', 'REP'].includes(session.role)) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { leadId, type, value, label } = await request.json()

    if (!leadId || !type || !value || !label) {
      return NextResponse.json({ error: 'leadId, type, value, and label are required' }, { status: 400 })
    }

    if (!['PHONE', 'EMAIL'].includes(type)) {
      return NextResponse.json({ error: 'type must be "PHONE" or "EMAIL"' }, { status: 400 })
    }

    const validLabels = ['Owner Cell', 'Business Partner', 'Spouse', 'Office', 'Other']
    if (!validLabels.includes(label)) {
      return NextResponse.json({ error: `label must be one of: ${validLabels.join(', ')}` }, { status: 400 })
    }

    // Basic format validation
    const trimmedValue = value.trim()
    if (type === 'PHONE') {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,15}$/
      if (!phoneRegex.test(trimmedValue)) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    } else if (type === 'EMAIL') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedValue)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
      }
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check for duplicates
    const existing = await prisma.leadContact.findFirst({
      where: { leadId, value: trimmedValue },
    })

    if (existing) {
      return NextResponse.json({ error: 'This contact already exists for this lead' }, { status: 409 })
    }

    const repId = (session as any).id || (session as any).userId
    const repName = session.name || 'Rep'

    const contact = await prisma.leadContact.create({
      data: {
        leadId,
        type,
        value: trimmedValue,
        label,
        addedBy: repId,
      },
    })

    await prisma.leadEvent.create({
      data: {
        leadId,
        eventType: 'ALTERNATE_CONTACT_ADDED',
        actor: `rep:${repId}`,
        metadata: {
          repId,
          repName,
          contactType: type,
          contactValue: trimmedValue,
          contactLabel: label,
          timestamp: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({ success: true, contact })
  } catch (error) {
    console.error('Add contact error:', error)
    return NextResponse.json(
      { error: 'Failed to add contact', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
