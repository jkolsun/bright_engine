import { NextRequest, NextResponse } from 'next/server'

const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body } = await request.json()

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 })
    }

    const apiKey = process.env.INSTANTLY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Instantly API key not configured' }, { status: 500 })
    }

    // Get the first connected email account from Instantly
    const accountsRes = await fetch(`${INSTANTLY_API_BASE}/accounts?limit=1`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!accountsRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch Instantly accounts' }, { status: 500 })
    }

    const accountsData = await accountsRes.json()
    const accounts = accountsData.items || accountsData || []
    const fromEmail = accounts[0]?.email

    if (!fromEmail) {
      return NextResponse.json({ error: 'No connected email accounts found in Instantly' }, { status: 500 })
    }

    // Send test email via Instantly's unibox/emails endpoint
    const sendRes = await fetch(`${INSTANTLY_API_BASE}/unibox/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_address: fromEmail,
        to_address: to,
        subject,
        body: body.replace(/\n/g, '<br>'),
      }),
    })

    if (sendRes.ok) {
      return NextResponse.json({ success: true, from: fromEmail })
    }

    // If unibox doesn't work, try the raw email send
    const errorText = await sendRes.text()
    console.error('[Email Preview] Instantly send failed:', sendRes.status, errorText)
    return NextResponse.json({
      error: `Instantly API returned ${sendRes.status}. Test emails may require a Pro plan.`,
    }, { status: 500 })

  } catch (error) {
    console.error('[Email Preview] Send test error:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}