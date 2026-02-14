import { NextRequest, NextResponse } from 'next/server'

// POST /api/webhook-trigger-simple - Simple webhook test without dependencies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🚀 Simple webhook test received:', body)
    
    return NextResponse.json({ 
      success: true, 
      received: body,
      timestamp: new Date().toISOString(),
      message: 'Webhook test successful'
    })
  } catch (error) {
    console.error('Simple webhook error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}