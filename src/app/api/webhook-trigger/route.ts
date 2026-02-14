import { NextRequest, NextResponse } from 'next/server'

// POST /api/webhook-trigger - Main webhook testing endpoint
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Webhook trigger called')
    
    const body = await request.json()
    console.log('📥 Received body:', body)
    
    return NextResponse.json({ 
      success: true,
      message: "Main webhook trigger working",
      received: body,
      timestamp: new Date().toISOString(),
      processId: process.pid || 'unknown'
    })
    
  } catch (error) {
    console.error('❌ Webhook trigger error:', error)
    
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET /api/webhook-trigger - Health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "Main webhook trigger endpoint is healthy",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'unknown'
  })
}