import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'
import { getPricingConfig } from '@/lib/pricing-config'

export const dynamic = 'force-dynamic'

/**
 * GET /api/rep-config
 * Returns admin-configured settings relevant to the current rep.
 * Accessible by any authenticated user (REP or ADMIN).
 * Merges global targets with per-rep overrides.
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Fetch targets and rep-specific overrides in parallel
    const [targetsSetting, repTargetsSetting] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'targets' } }),
      prisma.settings.findUnique({ where: { key: 'rep_targets' } }),
    ])

    // Global defaults
    const defaults = {
      dailyDials: 100,
      dailyConversations: 20,
      dailyCloses: 3,
      dailyLeadCap: 25,
      monthlyRevenueTarget: 50000,
    }

    const globalTargets = targetsSetting?.value
      ? { ...defaults, ...(targetsSetting.value as any) }
      : defaults

    // Check for per-rep override
    const repOverrides = repTargetsSetting?.value as Record<string, any> | null
    const myOverride = repOverrides?.[session.userId]

    const targets = myOverride
      ? { ...globalTargets, ...myOverride }
      : globalTargets

    // Get the rep's commission rate and pricing config in parallel
    const [user, pricing, personalizationSetting] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { commissionRate: true },
      }),
      getPricingConfig(),
      prisma.settings.findUnique({ where: { key: 'personalization' } }),
    ])

    // Extract admin-configured default call script
    const personalizationValue = personalizationSetting?.value as Record<string, any> | null
    const defaultCallScript = personalizationValue?.defaultCallScript || null

    return NextResponse.json({
      targets: {
        dials: targets.dailyDials,
        conversations: targets.dailyConversations,
        closes: targets.dailyCloses,
        leadCap: targets.dailyLeadCap,
        monthlyRevenue: targets.monthlyRevenueTarget,
      },
      commissionRate: user?.commissionRate ?? 75,
      productPrice: pricing.firstMonthTotal,
      defaultCallScript,
    })
  } catch (error) {
    console.error('Rep config error:', error)
    return NextResponse.json(
      { error: 'Failed to load config' },
      { status: 500 }
    )
  }
}
