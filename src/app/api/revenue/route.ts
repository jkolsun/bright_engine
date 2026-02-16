import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// GET /api/revenue - List revenue transactions
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    // Admin-only access check - financial data
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }
    const [revenue, total] = await Promise.all([
      prisma.revenue.findMany({
        include: {
          client: {
            select: {
              id: true,
              companyName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.revenue.count()
    ])

    return NextResponse.json({ revenue, total })
  } catch (error) {
    console.error('Error fetching revenue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue' },
      { status: 500 }
    )
  }
}
