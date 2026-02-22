/**
 * Vercel Domains API Wrapper
 *
 * Manages custom domains on the Vercel client-site project.
 * Used for launching client sites at their own domains.
 */

const VERCEL_API = 'https://api.vercel.com'

function getConfig() {
  const token = process.env.VERCEL_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    throw new Error('Missing VERCEL_TOKEN or VERCEL_PROJECT_ID environment variables')
  }

  return { token, projectId, teamId }
}

function buildUrl(path: string, teamId?: string): string {
  const url = new URL(path, VERCEL_API)
  if (teamId) url.searchParams.set('teamId', teamId)
  return url.toString()
}

/**
 * Add a custom domain to the Vercel project.
 * Returns the domain config from Vercel.
 */
export async function addDomain(domain: string): Promise<{
  name: string
  apexName: string
  verified: boolean
  configuredBy?: string
}> {
  const { token, projectId, teamId } = getConfig()

  const res = await fetch(
    buildUrl(`/v10/projects/${projectId}/domains`, teamId),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    }
  )

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Vercel API error: ${error.error?.message || error.message || res.statusText}`)
  }

  return res.json()
}

/**
 * Remove a custom domain from the Vercel project.
 */
export async function removeDomain(domain: string): Promise<void> {
  const { token, projectId, teamId } = getConfig()

  const res = await fetch(
    buildUrl(`/v9/projects/${projectId}/domains/${domain}`, teamId),
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok && res.status !== 404) {
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Vercel API error: ${error.error?.message || error.message || res.statusText}`)
  }
}

/**
 * Check domain configuration and DNS status.
 */
export async function checkDomain(domain: string): Promise<{
  name: string
  configured: boolean
  verified: boolean
  misconfigured: boolean
  txtVerification?: { name: string; value: string }
}> {
  const { token, projectId, teamId } = getConfig()

  const res = await fetch(
    buildUrl(`/v9/projects/${projectId}/domains/${domain}`, teamId),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) {
    if (res.status === 404) {
      return { name: domain, configured: false, verified: false, misconfigured: false }
    }
    const error = await res.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(`Vercel API error: ${error.error?.message || error.message || res.statusText}`)
  }

  const data = await res.json()
  return {
    name: data.name,
    configured: !data.misconfigured,
    verified: data.verified,
    misconfigured: data.misconfigured || false,
    txtVerification: data.verification?.[0],
  }
}

/**
 * Add both apex and www domains. www redirects to apex (industry standard).
 */
export async function addDomainWithWww(domain: string): Promise<{
  name: string
  apexName: string
  verified: boolean
  configuredBy?: string
}> {
  const apex = domain.replace(/^www\./, '')
  const result = await addDomain(apex)

  // Add www with redirect to apex (non-fatal if it fails)
  if (!apex.includes('.', apex.indexOf('.') + 1)) {
    // Only add www for apex domains (e.g. example.com, not sub.example.com)
    try {
      const { token, projectId, teamId } = getConfig()
      await fetch(
        buildUrl(`/v10/projects/${projectId}/domains`, teamId),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `www.${apex}`,
            redirect: apex,
            redirectStatusCode: 301,
          }),
        }
      )
    } catch (err) {
      console.warn(`[Vercel] www.${apex} redirect failed (non-fatal):`, err)
    }
  }

  return result
}

/**
 * Check domain DNS configuration (is it pointing to Vercel?).
 */
export async function checkDomainConfig(domain: string): Promise<{
  configuredBy: string | null
  misconfigured: boolean
}> {
  const { token, teamId } = getConfig()

  const res = await fetch(
    buildUrl(`/v6/domains/${domain}/config`, teamId),
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    return { configuredBy: null, misconfigured: true }
  }

  const data = await res.json()
  return {
    configuredBy: data.configuredBy || null,
    misconfigured: data.misconfigured || false,
  }
}

/**
 * Trigger domain verification on Vercel.
 */
export async function verifyDomain(domain: string): Promise<{
  verified: boolean
}> {
  const { token, projectId, teamId } = getConfig()

  const res = await fetch(
    buildUrl(`/v9/projects/${projectId}/domains/${domain}/verify`, teamId),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }
  )

  if (!res.ok) return { verified: false }

  const data = await res.json()
  return { verified: data.verified === true }
}

/**
 * Get human-readable DNS instructions for a domain.
 */
export function getDnsInstructions(domain: string): string {
  const apex = domain.replace(/^www\./, '')

  return `To connect ${apex} to your new website, update your DNS settings at your domain registrar (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.):

Add BOTH of these records:
  A record: Name "@" (or blank) → Value 76.76.21.21
  CNAME record: Name "www" → Value cname.vercel-dns.com

Changes usually take 5-30 minutes but can take up to 48 hours. We're monitoring it and will text you the moment it's live.

If you're not sure how to do this, just text me the name of your domain registrar and I'll send step-by-step instructions.`
}
