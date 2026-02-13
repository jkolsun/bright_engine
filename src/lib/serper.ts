import { prisma } from './db'

const SERPER_API_KEY = process.env.SERPER_API_KEY!

export async function fetchSerperResearch(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) {
    throw new Error('Lead not found')
  }

  try {
    // Search for recent news/info about the company
    const query = `${lead.companyName} ${lead.city} ${lead.state} ${lead.industry}`

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 5,
      }),
    })

    if (!response.ok) {
      throw new Error(`Serper error: ${response.statusText}`)
    }

    const data = await response.json()

    // Use top results to generate personalized opening line
    const snippet = data.organic?.[0]?.snippet || ''

    // Simple personalization (in production, use AI to generate better lines)
    let personalization = ''

    if (snippet.includes('award') || snippet.includes('best')) {
      personalization = `Saw ${lead.companyName} has been recognized in ${lead.city} — impressive.`
    } else if (snippet.includes('years') || snippet.includes('serving')) {
      personalization = `${lead.companyName} has a solid reputation in the ${lead.city} ${lead.industry} space.`
    } else if (lead.enrichedReviews && lead.enrichedReviews > 50) {
      personalization = `${lead.enrichedReviews} reviews is strong — people clearly trust ${lead.companyName}.`
    } else if (lead.website && lead.website.includes('wix')) {
      personalization = `Noticed ${lead.companyName} is on Wix — most ${lead.industry} companies we work with outgrow it fast.`
    } else {
      personalization = `I came across ${lead.companyName} while researching ${lead.industry} companies in ${lead.city}.`
    }

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { personalization },
    })

    // Log cost
    await prisma.apiCost.create({
      data: {
        service: 'serper',
        operation: 'personalization',
        cost: 0.005, // ~$0.005 per search
      },
    })

    return personalization
  } catch (error) {
    console.error('Serper personalization failed:', error)
    
    // Fallback personalization
    const fallback = `I came across ${lead.companyName} and wanted to reach out.`
    
    await prisma.lead.update({
      where: { id: leadId },
      data: { personalization: fallback },
    })

    return fallback
  }
}

export default { fetchSerperResearch }
