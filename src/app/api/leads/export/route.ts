import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Admin-only access check - exporting sensitive lead data
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const campaign = request.nextUrl.searchParams.get('campaign')
    const leads = await prisma.lead.findMany({
      where: campaign ? { campaign } : {},
      orderBy: { createdAt: 'desc' },
    })

    // Generate CSV
    const headers = 'First Name,Last Name,Email,Phone,Company,City,State,Industry,Preview URL,Personalization\n'
    const rows = leads.map(l =>
      `"${l.firstName}","${l.lastName}","${l.email}","${l.phone}","${l.companyName}","${l.city}","${l.state}","${l.industry}","${l.previewUrl || ''}","${(l.personalization || '').toString().replace(/"/g, '""')}"`
    ).join('\n')

    return new NextResponse(headers + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="campaign_${campaign || 'all'}_leads.csv"`,
      }
    })
  } catch (error) {
    console.error('Error exporting leads:', error)
    return NextResponse.json(
      { error: 'Failed to export leads', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}