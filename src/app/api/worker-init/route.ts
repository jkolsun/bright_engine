import { NextResponse } from 'next/server'

// Workers now run in a dedicated Railway service (npm run worker).
// This endpoint is kept for backward compatibility but no longer starts workers.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Workers run in dedicated worker service — not in the web process',
    workerStarted: true,
  })
}
