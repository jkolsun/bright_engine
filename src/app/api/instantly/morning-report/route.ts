import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/instantly/morning-report
 * Get the latest morning briefing report
 * Or fetch a specific date's report
 * Admin-only
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const dateParam = request.nextUrl.searchParams.get('date')

    let report

    if (dateParam) {
      // Fetch specific date
      const targetDate = new Date(dateParam)
      report = await prisma.instantlyDailyReport.findUnique({
        where: { reportDate: targetDate },
      })
    } else {
      // Get latest report
      report = await prisma.instantlyDailyReport.findFirst({
        orderBy: { reportDate: 'desc' },
        take: 1,
      })
    }

    if (!report) {
      return NextResponse.json(
        {
          status: 'no_reports_yet',
          message: 'No morning reports generated yet. First sync happens at 8 AM ET.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      report_date: report.reportDate,
      sync_timestamp: report.syncTimestamp,
      full_report: report.fullReport,
      sms_report: report.smsReport,
      capacity_utilization: report.capacityUtilization,
      total_pushing: report.totalPushing,
      total_followups: report.totalFollowups,
      sms_sent: report.smsSent,
      sms_sent_at: report.smsSentAt,
      alerts: report.alerts,
      changes: report.changes,
      today_plan: report.todayPlan,
    })
  } catch (error) {
    console.error('Morning report error:', error)
    return NextResponse.json(
      { error: 'Failed to get report', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
