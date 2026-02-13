import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function PreviewPage({ params }: { params: { id: string } }) {
  try {
    // Find lead by previewId
    const lead = await prisma.lead.findFirst({
      where: { previewId: params.id }
    })

    if (!lead) {
      notFound()
    }

    // Check expiration
    if (lead.previewExpiresAt && new Date(lead.previewExpiresAt) < new Date()) {
      return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <h1>Preview Expired</h1>
          <p>This preview has expired and is no longer available.</p>
        </div>
      )
    }

    let personalization: any = {}
    try {
      if (typeof lead.personalization === 'string') {
        personalization = JSON.parse(lead.personalization)
      } else if (lead.personalization) {
        personalization = lead.personalization
      }
    } catch {
      personalization = { firstLine: String(lead.personalization || '') }
    }

    return (
      <html lang="en">
        <head>
          <title>{lead.companyName} - Site Preview</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>{`
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 60px 20px; text-align: center; border-radius: 8px; margin-bottom: 40px; }
            h1 { font-size: 2.5em; margin-bottom: 10px; }
            .tagline { font-size: 1.2em; opacity: 0.9; margin-bottom: 20px; font-style: italic; }
            .company-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #667eea; }
            .value { color: #666; }
            .preview-section { margin: 40px 0; padding: 30px; background: white; border: 1px solid #eee; border-radius: 8px; }
            .preview-title { font-size: 1.5em; margin-bottom: 15px; color: #333; font-weight: 600; }
            .personalization-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .personalization-label { font-size: 0.9em; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
            .personalization-text { font-size: 1.3em; font-weight: 500; }
            .enrichment-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
            .enrichment-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .enrichment-card h3 { color: #667eea; margin-bottom: 10px; font-size: 0.95em; text-transform: uppercase; }
            .enrichment-card p { color: #666; }
            .rating { color: #f5576c; font-weight: bold; }
            footer { text-align: center; padding: 40px 20px; color: #999; border-top: 1px solid #eee; margin-top: 60px; }
            .metadata { font-size: 0.85em; color: #999; margin-top: 20px; }
          `}</style>
        </head>
        <body>
          <div className="container">
            {/* Header */}
            <header>
              <h1>{lead.companyName}</h1>
              {personalization?.firstLine && (
                <div className="tagline">"{personalization.firstLine}"</div>
              )}
              <div style={{ fontSize: '0.95em', opacity: 0.8 }}>
                {lead.city}, {lead.state}
              </div>
            </header>

            {/* Company Info */}
            <div className="company-info">
              <h2 style={{ marginBottom: '15px', fontSize: '1.2em', color: '#333' }}>Business Information</h2>
              <div className="info-row">
                <span className="label">Location</span>
                <span className="value">{lead.city}, {lead.state}</span>
              </div>
              {lead.website && (
                <div className="info-row">
                  <span className="label">Website</span>
                  <span className="value">{lead.website}</span>
                </div>
              )}
              {lead.phone && (
                <div className="info-row">
                  <span className="label">Phone</span>
                  <span className="value">{lead.phone}</span>
                </div>
              )}
              <div className="info-row">
                <span className="label">Industry</span>
                <span className="value">{lead.industry}</span>
              </div>
            </div>

            {/* Personalization */}
            {personalization?.firstLine && (
              <div className="preview-section">
                <div className="preview-title">🎯 Personalized Outreach</div>
                <div className="personalization-card">
                  <div className="personalization-label">Opening Line</div>
                  <div className="personalization-text">"{personalization.firstLine}"</div>
                </div>
                {personalization?.hook && (
                  <div style={{ marginTop: '15px', padding: '15px', background: '#f0f0f0', borderRadius: '6px' }}>
                    <strong>Hook:</strong> {personalization.hook}
                  </div>
                )}
                {personalization?.angle && (
                  <div style={{ marginTop: '10px', padding: '15px', background: '#f0f0f0', borderRadius: '6px' }}>
                    <strong>Angle:</strong> {personalization.angle}
                  </div>
                )}
              </div>
            )}

            {/* Enrichment Data */}
            {(lead.enrichedRating || lead.enrichedServices) && (
              <div className="preview-section">
                <div className="preview-title">📊 Company Profile</div>
                <div className="enrichment-grid">
                  {lead.enrichedRating && (
                    <div className="enrichment-card">
                      <h3>Rating</h3>
                      <p><span className="rating">★ {lead.enrichedRating}/5</span></p>
                      <p style={{ fontSize: '0.9em' }}>({lead.enrichedReviews} reviews)</p>
                    </div>
                  )}
                  {lead.enrichedServices && Array.isArray(lead.enrichedServices) && lead.enrichedServices.length > 0 && (
                    <div className="enrichment-card">
                      <h3>Services</h3>
                      <p>{(lead.enrichedServices as string[]).join(', ')}</p>
                    </div>
                  )}
                  {lead.enrichedAddress && (
                    <div className="enrichment-card">
                      <h3>Address</h3>
                      <p>{lead.enrichedAddress}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <footer>
              <p>Personalized preview generated by Bright Automations</p>
              <div className="metadata">
                Preview ID: {lead.previewId}<br />
                Expires: {new Date(lead.previewExpiresAt!).toLocaleDateString()}
              </div>
            </footer>
          </div>
        </body>
      </html>
    )
  } catch (error) {
    console.error('Preview error:', error)
    notFound()
  }
}
