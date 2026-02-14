import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/webhook-trigger-simple - Ultra simple test
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({ 
      success: true,
      message: "Simple webhook working perfectly",
      received: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Simple webhook error:', error)
    return NextResponse.json({ 
      success: false,
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// GET /api/webhook-trigger-simple - Health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    message: "Simple webhook endpoint is working",
    timestamp: new Date().toISOString()
  })
}