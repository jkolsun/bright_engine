/**
 * FullEnrich email enrichment — bulk POST to their waterfall API.
 * Fire-and-forget: we POST contacts, they call our webhook when done.
 */

export async function callFullEnrich(params: {
  leads: Array<{ id: string; companyName: string; firstName?: string; lastName?: string | null }>
  batchName: string
}): Promise<void> {
  const apiKey = process.env.FULLENRICH_API_KEY
  if (!apiKey) {
    console.warn('[FullEnrich] FULLENRICH_API_KEY not set — skipping')
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BASE_URL ?? 'https://preview.brightautomations.org'
  const webhookUrl = baseUrl + '/api/webhooks/fullenrich'

  // Split into chunks of 100 (FullEnrich max per call)
  const CHUNK_SIZE = 100
  for (let i = 0; i < params.leads.length; i += CHUNK_SIZE) {
    const chunk = params.leads.slice(i, i + CHUNK_SIZE)

    const body = {
      name: 'Bright Automations — ' + params.batchName,
      webhook_url: webhookUrl,
      datas: chunk.map(lead => ({
        firstname: lead.firstName || '',
        lastname: lead.lastName || '',
        company_name: lead.companyName,
        enrich_fields: ['contact.emails'],
        custom: { lead_id: lead.id },
      })),
    }

    try {
      const response = await fetch('https://app.fullenrich.com/api/v1/contact/enrich/bulk', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('[FullEnrich] API error ' + response.status + ':', errText)
      } else {
        console.log('[FullEnrich] Queued ' + chunk.length + ' contacts for enrichment')
      }
    } catch (err) {
      console.error('[FullEnrich] Request failed:', err)
    }
  }
}
