import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const imports = await prisma.clawdbotActivity.findMany({
      where: { actionType: 'IMPORT' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        description: true,
        metadata: true,
      },
    })

    return NextResponse.json({ imports })
  } catch (error) {
    console.error('Failed to fetch import history:', error)
    return NextResponse.json({ error: 'Failed to fetch import history' }, { status: 500 })
  }
}