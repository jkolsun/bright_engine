import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/lead-contacts/[leadId]
 * Returns all alternate contacts for a lead. Admin only.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { leadId } = await context.params

    const contacts = await prisma.leadContact.findMany({
      where: { leadId },
      orderBy: { addedAt: 'desc' },
    })

    // Enrich with rep names
    const enrichedContacts = await Promise.all(
      contacts.map(async (contact) => {
        let addedByName: string | null = null
        if (contact.addedBy) {
          const rep = await prisma.user.findUnique({
            where: { id: contact.addedBy },
            select: { name: true },
          })
          addedByName = rep?.name || 'Unknown'
        }
        return {
          ...contact,
          addedByName,
        }
      })
    )

    return NextResponse.json({ contacts: enrichedContacts })
  } catch (error) {
    console.error('Fetch lead contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/lead-contacts/[leadId]?contactId=xxx
 * Admin deletes an alternate contact. Uses query param for contactId since
 * Next.js can't have two different dynamic segments at the same level.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const contactId = request.nextUrl.searchParams.get('contactId')
    if (!contactId) {
      return NextResponse.json({ error: 'contactId query parameter required' }, { status: 400 })
    }

    const contact = await prisma.leadContact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.leadContact.delete({
      where: { id: contactId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete contact error:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
