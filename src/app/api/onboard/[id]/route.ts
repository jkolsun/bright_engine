import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/onboard/[id]
 * Fetch lead onboarding data by ID. Returns current onboarding state
 * plus pre-filled fields from the lead record.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        companyName: true,
        phone: true,
        email: true,
        city: true,
        state: true,
        services: true,
        logo: true,
        photos: true,
        website: true,
        onboardingData: true,
        onboardingStep: true,
        onboardingStatus: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({
      onboardingData: lead.onboardingData ?? {},
      onboardingStep: lead.onboardingStep ?? 0,
      onboardingStatus: lead.onboardingStatus ?? 'NOT_STARTED',
      preFilled: {
        companyName: lead.companyName,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        state: lead.state,
        services: lead.services,
        logo: lead.logo,
        photos: lead.photos,
        website: lead.website,
      },
    })
  } catch (error) {
    console.error('[Onboard GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch onboarding data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/onboard/[id]
 * Save step data. Merges data into onboardingData JSON,
 * updates onboardingStep, and sets onboardingStatus to IN_PROGRESS.
 * Body: { step: number, data: Record<string, any> }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { step, data } = body as { step: number; data: Record<string, any> }

    if (typeof step !== 'number' || !data) {
      return NextResponse.json(
        { error: 'Invalid body. Required: { step: number, data: Record<string, any> }' },
        { status: 400 }
      )
    }

    // Fetch existing lead to merge onboardingData
    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { onboardingData: true },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const existingData = (lead.onboardingData as Record<string, any>) ?? {}
    const mergedData = { ...existingData, ...data }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        onboardingData: mergedData,
        onboardingStep: step,
        onboardingStatus: 'IN_PROGRESS',
      },
      select: {
        id: true,
        onboardingData: true,
        onboardingStep: true,
        onboardingStatus: true,
      },
    })

    return NextResponse.json({
      success: true,
      onboardingData: updated.onboardingData,
      onboardingStep: updated.onboardingStep,
      onboardingStatus: updated.onboardingStatus,
    })
  } catch (error) {
    console.error('[Onboard PUT] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save onboarding data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
