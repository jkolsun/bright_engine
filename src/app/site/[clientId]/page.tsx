import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { STATIC_PAGE_ROUTER_SCRIPT, getAccentCssTag } from '@/components/preview/shared/staticPageRouter'

export const dynamic = 'force-dynamic'

/**
 * Production site renderer for client custom domains.
 * Serves the same HTML as the preview engine but without preview UI
 * (no CTA banner, no "$149" text, no BA branding).
 */

export async function generateMetadata(
  { params }: { params: Promise<{ clientId: string }> }
): Promise<Metadata> {
  const { clientId } = await params
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyName: true, industry: true, location: true, phone: true },
  })
  if (!client) return { title: 'Site Not Found' }

  const industry = client.industry?.replace(/_/g, ' ') || 'Professional Services'
  return {
    title: `${client.companyName} | ${industry}`,
    description: `${client.companyName}${client.location ? ` in ${client.location}` : ''}. ${client.phone ? `Call us: ${client.phone}` : ''}`,
    openGraph: {
      title: client.companyName,
      description: `Professional ${industry.toLowerCase()} services`,
      type: 'website',
    },
  }
}

export default async function ClientSitePage(
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params

  const client = await prisma.client.findUnique({
    where: { id: clientId, hostingStatus: 'ACTIVE' },
    select: {
      id: true,
      leadId: true,
      companyName: true,
      siteUrl: true,
    },
  })

  if (!client || !client.leadId) return notFound()

  const lead = await prisma.lead.findUnique({
    where: { id: client.leadId },
    select: { siteHtml: true, colorPrefs: true },
  })

  if (!lead?.siteHtml) return notFound()

  const colorPrefs = lead.colorPrefs as { primary?: string; accent?: string } | null
  const accentHex = colorPrefs?.accent || colorPrefs?.primary || undefined
  const accentTag = getAccentCssTag(accentHex)

  // Clean the HTML — same pattern as preview renderer
  let cleanHtml = lead.siteHtml
  // Strip CTA banner
  cleanHtml = cleanHtml.replace(
    /<div[^>]*class="[^"]*fixed bottom-0[^"]*bg-\[#0D7377\][^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g,
    ''
  )
  // Strip raw AI placeholder labels
  cleanHtml = cleanHtml.replace(/\bABOUT_P[0-9]:\s*/gi, '')
  cleanHtml = cleanHtml.replace(/\bVP[0-9]_(TITLE|DESC)\b:?\s*/gi, '')

  const headMatch = cleanHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  const headContent = headMatch?.[1] || ''
  let bodyContent = bodyMatch?.[1] || cleanHtml

  // Ensure the static page router is present (handles navigation, CTAs, hamburger menu)
  // It may be missing if the site was saved before the router existed or if an AI edit stripped it
  if (bodyContent.indexOf('sp-mobile-overlay') === -1) {
    bodyContent += accentTag + STATIC_PAGE_ROUTER_SCRIPT
  }

  // Kill overlay CSS+script (no preview/disclaimer banners on live sites)
  const killOverlay = `<style>.fixed.inset-0[class*="z-[9999"]{display:none!important}.fixed.bottom-0[class*="bg-\\[#0D7377"]{display:none!important}</style><script>document.querySelectorAll('div').forEach(function(e){if(e.className&&(e.className.indexOf('z-[9999]')!==-1||(e.className.indexOf('fixed')!==-1&&e.className.indexOf('bg-[#0D7377')!==-1)))e.remove()})</script>`

  // Analytics tracking for production sites (increment page views)
  const trackScript = `<script>(function(){try{fetch('/api/preview/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({previewId:'${client.leadId}',event:'page_view'})})}catch(e){}})()</script>`

  return (
    <html lang="en">
      <head dangerouslySetInnerHTML={{ __html: headContent + killOverlay }} />
      <body dangerouslySetInnerHTML={{ __html: bodyContent + trackScript }} />
    </html>
  )
}
