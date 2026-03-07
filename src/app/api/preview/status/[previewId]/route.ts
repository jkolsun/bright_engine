import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.MARKETING_SITE_ORIGIN || 'https://www.brightautomations.org',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// In-memory rate limiter (same pattern as middleware.ts:9-25)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 200 // requests per IP per hour
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  // Cleanup stale entries to prevent memory leak (same pattern as middleware.ts:19-22)
  if (rateLimitMap.size > 10_000) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.resetTime) rateLimitMap.delete(key)
    }
  }
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }
  entry.count++
  return entry.count <= RATE_LIMIT
}

/**
 * OPTIONS /api/preview/status/[previewId] — CORS preflight handler
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

/**
 * GET /api/preview/status/[previewId] — Public build status polling endpoint
 * Used by the marketing site to check when a preview is ready to view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ previewId: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429, headers: corsHeaders })
  }

  const { previewId } = await params
  const lead = await prisma.lead.findUnique({
    where: { previewId },
    select: {
      buildStep: true,
      previewUrl: true,
      buildError: true,
    },
  })

  if (!lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
  }

  // Redirect at SCRIPTS or later — workers set buildStep at the START of work,
  // so SCRIPTS means personalization COMPLETED and AI copy exists.
  //
  // Valid buildStep progression from build-step-machine.ts:
  //   ENRICHMENT → PREVIEW → PERSONALIZATION → SCRIPTS → DISTRIBUTION → COMPLETE
  //     → QA_REVIEW → EDITING → QA_APPROVED → CLIENT_REVIEW
  //     → CLIENT_APPROVED → LAUNCHING → LAUNCHED → LIVE
  //
  // BUILDING is excluded (never set by automated pipeline — manual/legacy state).
  // PAYMENT_SENT is excluded (set by approvals route, not pipeline).
  const readySteps = [
    'SCRIPTS', 'DISTRIBUTION', 'COMPLETE',
    'QA_REVIEW', 'EDITING', 'QA_APPROVED', 'CLIENT_REVIEW',
    'CLIENT_APPROVED', 'LAUNCHING', 'LAUNCHED', 'LIVE',
  ]
  const isReady = readySteps.includes(lead.buildStep || '')

  return NextResponse.json(
    {
      status: lead.buildError ? 'error' : isReady ? 'ready' : 'building',
      buildStep: lead.buildStep || 'ENRICHMENT',
      previewUrl: lead.previewUrl,
    },
    { headers: corsHeaders }
  )
}
