import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export interface PaymentLinkEntry {
  id: string
  label: string
  url: string
  price: number
  recurring: boolean
  envKey: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

// GET /api/settings/payment-links
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const setting = await prisma.settings.findUnique({
      where: { key: 'payment_links' }
    })
    const dbLinks: PaymentLinkEntry[] = setting?.value
      ? (Array.isArray(setting.value) ? (setting.value as unknown as PaymentLinkEntry[]) : [])
      : []

    // Check which env vars are set (server-side only, truncated for security)
    const envLinks: Record<string, { set: boolean; preview: string }> = {
      STRIPE_LINK_SITE_BUILD: envStatus(process.env.STRIPE_LINK_SITE_BUILD),
      STRIPE_LINK_HOSTING_39: envStatus(process.env.STRIPE_LINK_HOSTING_39),
      STRIPE_LINK_HOSTING_ANNUAL: envStatus(process.env.STRIPE_LINK_HOSTING_ANNUAL),
      STRIPE_LINK_GBP: envStatus(process.env.STRIPE_LINK_GBP),
      STRIPE_LINK_REVIEW_WIDGET: envStatus(process.env.STRIPE_LINK_REVIEW_WIDGET),
      STRIPE_LINK_SEO: envStatus(process.env.STRIPE_LINK_SEO),
      STRIPE_LINK_SOCIAL: envStatus(process.env.STRIPE_LINK_SOCIAL),
    }

    return NextResponse.json({ links: dbLinks, envLinks })
  } catch (error) {
    console.error('Error fetching payment links:', error)
    return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
  }
}

// POST /api/settings/payment-links — Save full array (replace all)
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const { links } = await request.json()

    if (!Array.isArray(links)) {
      return NextResponse.json({ error: 'links must be an array' }, { status: 400 })
    }

    for (const link of links) {
      if (!link.label || !link.id) {
        return NextResponse.json({ error: 'Each link needs id and label' }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const stamped = links.map((link: PaymentLinkEntry) => ({
      ...link,
      updatedAt: now,
      createdAt: link.createdAt || now,
    }))

    await prisma.settings.upsert({
      where: { key: 'payment_links' },
      create: { key: 'payment_links', value: stamped as any },
      update: { value: stamped as any },
    })

    return NextResponse.json({ success: true, links: stamped })
  } catch (error) {
    console.error('Error saving payment links:', error)
    return NextResponse.json({ error: 'Failed to save payment links' }, { status: 500 })
  }
}

function envStatus(value: string | undefined): { set: boolean; preview: string } {
  if (!value) return { set: false, preview: '' }
  const preview = value.length > 35
    ? value.substring(0, 30) + '...' + value.substring(value.length - 5)
    : value
  return { set: true, preview }
}
