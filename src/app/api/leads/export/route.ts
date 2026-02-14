import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
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
}