import { NextRequest, NextResponse } from 'next/server'

// POST /api/webhook-trigger - Simple webhook testing (no auth for debugging)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('🚀 Webhook trigger received:', body)
    
    // Simple test response without complex dependencies
    return NextResponse.json({ 
      success: true,
      received: body,
      timestamp: new Date().toISOString(),
      message: 'Webhook trigger test successful - no auth required for debugging'
    })

  } catch (error) {
    console.error('Webhook trigger error:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}