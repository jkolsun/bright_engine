import { NextResponse } from 'next/server'
import { startWorkersOnce, getWorkerStatus } from '@/worker/worker-manager'

export async function GET() {
  await startWorkersOnce()
  const status = getWorkerStatus()
  return NextResponse.json({ 
    status: 'ok',
    redis: true,
    reason: status.workerStarted ? 'Worker started' : 'Worker failed to start',
    workerStarted: status.workerStarted, 
    error: status.error 
  })
}