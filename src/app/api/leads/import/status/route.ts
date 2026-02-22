import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

export const dynamic = 'force-dynamic'

/**
 * GET /api/leads/import/status?jobId=xxx
 * Poll for background import processing progress.
 * Returns: { status, processed, total, failed, errors, results }
 */
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value
    const session = sessionCookie ? await verifySession(sessionCookie) : null
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin required' }, { status: 401 })
    }

    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    try {
      const Redis = (await import('ioredis')).default
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
      })

      const data = await redis.get(`import:${jobId}`)
      await redis.quit()

      if (!data) {
        return NextResponse.json({ error: 'Job not found or expired' }, { status: 404 })
      }

      return NextResponse.json(JSON.parse(data))
    } catch (err) {
      console.error('[Import Status] Redis error:', err)
      return NextResponse.json({ error: 'Failed to read job status' }, { status: 503 })
    }
  } catch (error) {
    console.error('Import status error:', error)
    return NextResponse.json({ error: 'Failed to get import status' }, { status: 500 })
  }
}
