import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const transactions = await prisma.revenue.findMany({
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    return NextResponse.json({ transactions })
  } catch { 
    return NextResponse.json({ transactions: [] }) 
  }
}