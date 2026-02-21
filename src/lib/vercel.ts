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
