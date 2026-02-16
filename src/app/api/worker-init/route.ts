import { NextResponse } from 'next/server'

let workerStarted = false
let workerError: string | null = null

export async function startWorkersOnce() {
  if (workerStarted) return
  
  workerStarted = true
  try {
    const { startWorkers } = await import('@/worker/index')
    await startWorkers()
    console.log('[Auto] Workers started')
  } catch (e) {
    workerError = e instanceof Error ? e.message : String(e)
    console.error('[Auto] Worker start failed:', workerError)
    workerStarted = false
  }
}

export async function GET() {
  await startWorkersOnce()
  return NextResponse.json({ workerStarted, error: workerError })
}