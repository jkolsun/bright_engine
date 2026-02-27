#!/usr/bin/env node

/**
 * GBP Lead Scraper — Bright Automations
 * 
 * Searches Google Maps via SerpAPI for businesses WITHOUT websites.
 * Outputs a CSV ready for import into Bright Automations.
 * 
 * Usage:
 *   SERPAPI_KEY=your_key node gbp-lead-scraper.js
 * 
 * Optional env vars:
 *   SERPAPI_KEY        — Required. Your SerpAPI API key.
 *   TARGET_LEADS       — How many no-website leads to collect (default: 150)
 *   OUTPUT_FILE        — Output CSV filename (default: gbp-leads-YYYY-MM-DD.csv)
 */

const fs = require('fs')
const path = require('path')

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const SERPAPI_KEY = process.env.SERPAPI_KEY
if (!SERPAPI_KEY) {
  console.error('❌ SERPAPI_KEY environment variable is required.')
  console.error('   Usage: SERPAPI_KEY=your_key node gbp-lead-scraper.js')
  process.exit(1)
}

const TARGET_LEADS = parseInt(process.env.TARGET_LEADS || '150', 10)
const today = new Date().toISOString().split('T')[0]
const OUTPUT_FILE = process.env.OUTPUT_FILE || `gbp-leads-${today}.csv`

// ─── SEARCH QUERIES ──────────────────────────────────────────────────────────
// Each query = 1 SerpAPI credit, returns ~20 results.
// We filter to only businesses WITHOUT a website.
// Adjust cities and verticals as needed.

const CITIES = [
  'Houston TX',
  'Dallas TX',
  'Phoenix AZ',
  'Atlanta GA',
  'Miami FL',
  'Denver CO',
  'Charlotte NC',
  'Nashville TN',
  'San Antonio TX',
  'Tampa FL',
  'Orlando FL',
  'Las Vegas NV',
  'Memphis TN',
  'Jacksonville FL',
  'Oklahoma City OK',
  'Louisville KY',
  'Richmond VA',
  'Birmingham AL',
  'New Orleans LA',
  'Tucson AZ',
]

const VERTICALS = [
  'roofer',
  'roofing company',
  'roof repair',
  'tree service',
  'tree removal',
  'tree trimming',
  'painter',
  'painting company',
  'house painting',
]

// Build all search queries: "vertical city"
function buildSearchQueries() {
  const queries = []
  for (const vertical of VERTICALS) {
    for (const city of CITIES) {
      queries.push(`${vertical} ${city}`)
    }
  }
  // Shuffle so we get variety across verticals/cities if we hit our target early
  return queries.sort(() => Math.random() - 0.5)
}

// ─── SERPAPI FETCH ───────────────────────────────────────────────────────────

async function searchGoogleMaps(query) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY,
    engine: 'google_maps',
    q: query,
    type: 'search',
  })

  const url = `https://serpapi.com/search.json?${params.toString()}`

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`SerpAPI error ${response.status}: ${text}`)
  }

  return response.json()
}

// ─── LEAD EXTRACTION ─────────────────────────────────────────────────────────

function extractLeadsFromResults(data, query) {
  const results = data.local_results || []
  const leads = []

  for (const r of results) {
    // CORE FILTER: Skip if they have a website
    if (r.website) continue

    // Skip if no phone number (can't call them)
    const phone = r.phone
    if (!phone) continue

    // Extract what we can
    const businessName = (r.title || '').trim()
    if (!businessName) continue

    // Try to get the city and state from the address
    const address = r.address || ''
    const addressParts = address.split(',').map(s => s.trim())
    let city = ''
    let state = ''
    if (addressParts.length >= 2) {
      city = addressParts[addressParts.length - 2] || ''
      // State might be in the last part with zip
      const lastPart = addressParts[addressParts.length - 1] || ''
      const stateMatch = lastPart.match(/([A-Z]{2})/)
      state = stateMatch ? stateMatch[1] : ''
    }

    // Determine industry from the query vertical
    const queryLower = query.toLowerCase()
    let industry = 'GENERAL_CONTRACTING'
    if (queryLower.includes('roof')) {
      industry = 'ROOFING'
    } else if (queryLower.includes('tree')) {
      industry = 'LANDSCAPING'
    } else if (queryLower.includes('paint')) {
      industry = 'PAINTING'
    }

    // Generate placeholder email (required by current CSV parser)
    // Format: noemail+companyslug@placeholder.bright.com
    const companySlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40)
    const placeholderEmail = `noemail+${companySlug}@placeholder.bright.com`

    leads.push({
      firstName: 'Owner',  // We don't know the owner name from GBP
      lastName: businessName.split(' ')[0], // Use first word of business as placeholder
      companyName: businessName,
      email: placeholderEmail,
      phone: phone,
      industry: industry,
      city: city,
      state: state,
      website: '',
      campaign: 'GBP_NO_WEBSITE',
      source: 'GBP_SCRAPE',
      // Extra fields for reference (won't be imported but useful)
      _rating: r.rating || '',
      _reviews: r.reviews || '',
      _address: address,
      _gpsCoordinates: r.gps_coordinates ? `${r.gps_coordinates.latitude},${r.gps_coordinates.longitude}` : '',
      _searchQuery: query,
    })
  }

  return leads
}

// ─── DEDUPLICATION ───────────────────────────────────────────────────────────

function deduplicateLeads(leads) {
  const seen = new Set()
  return leads.filter(lead => {
    // Dedupe by normalized phone number
    const normalizedPhone = lead.phone.replace(/\D/g, '')
    if (seen.has(normalizedPhone)) return false
    seen.add(normalizedPhone)
    return true
  })
}

// ─── CSV OUTPUT ──────────────────────────────────────────────────────────────

function escapeCSV(value) {
  const str = String(value || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function writeCSV(leads, filename) {
  // These are the columns Bright Automations CSV parser expects
  const importColumns = [
    'firstName', 'lastName', 'companyName', 'email', 'phone',
    'industry', 'city', 'state', 'website', 'campaign', 'source',
  ]

  // Extra columns for your reference (won't affect import)
  const extraColumns = ['_rating', '_reviews', '_address', '_gpsCoordinates', '_searchQuery']

  const allColumns = [...importColumns, ...extraColumns]
  const header = allColumns.join(',')
  const rows = leads.map(lead =>
    allColumns.map(col => escapeCSV(lead[col])).join(',')
  )

  const csv = [header, ...rows].join('\n')
  fs.writeFileSync(filename, csv, 'utf-8')
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  GBP Lead Scraper — Bright Automations              ║')
  console.log('║  Finding businesses WITHOUT websites on Google Maps ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`Target: ${TARGET_LEADS} leads`)
  console.log(`Output: ${OUTPUT_FILE}`)
  console.log(`Cities: ${CITIES.length}`)
  console.log(`Verticals: ${VERTICALS.length}`)
  console.log(`Total possible queries: ${CITIES.length * VERTICALS.length}`)
  console.log('')

  const queries = buildSearchQueries()
  let allLeads = []
  let queriesUsed = 0
  let totalResultsScanned = 0
  let noWebsiteFound = 0

  for (const query of queries) {
    // Stop if we have enough
    if (allLeads.length >= TARGET_LEADS) {
      console.log(`\n✅ Reached target of ${TARGET_LEADS} leads. Stopping.`)
      break
    }

    queriesUsed++
    process.stdout.write(`[${queriesUsed}] Searching: "${query}" ... `)

    try {
      const data = await searchGoogleMaps(query)
      const totalResults = (data.local_results || []).length
      const leads = extractLeadsFromResults(data, query)

      totalResultsScanned += totalResults
      noWebsiteFound += leads.length

      allLeads.push(...leads)

      console.log(`${totalResults} results → ${leads.length} without website (total: ${allLeads.length})`)

      // Rate limit: SerpAPI allows ~5 req/sec but let's be safe
      await new Promise(r => setTimeout(r, 250))

    } catch (err) {
      console.log(`ERROR: ${err.message}`)
      // If rate limited, wait longer
      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('   ⏳ Rate limited, waiting 5 seconds...')
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }

  // Deduplicate
  const uniqueLeads = deduplicateLeads(allLeads)
  console.log(`\n────────────────────────────────────────`)
  console.log(`Queries used:       ${queriesUsed} (${queriesUsed} SerpAPI credits)`)
  console.log(`Results scanned:    ${totalResultsScanned}`)
  console.log(`No-website found:   ${noWebsiteFound}`)
  console.log(`After dedup:        ${uniqueLeads.length}`)
  console.log(`────────────────────────────────────────`)

  if (uniqueLeads.length === 0) {
    console.log('\n⚠️  No leads found. Try different cities or verticals.')
    process.exit(0)
  }

  // Write CSV
  writeCSV(uniqueLeads, OUTPUT_FILE)
  console.log(`\n✅ Wrote ${uniqueLeads.length} leads to ${OUTPUT_FILE}`)

  // Print industry breakdown
  const byIndustry = {}
  for (const lead of uniqueLeads) {
    byIndustry[lead.industry] = (byIndustry[lead.industry] || 0) + 1
  }
  console.log('\nIndustry breakdown:')
  for (const [ind, count] of Object.entries(byIndustry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ind}: ${count}`)
  }

  // Print city breakdown
  const byCity = {}
  for (const lead of uniqueLeads) {
    const loc = lead.city || 'Unknown'
    byCity[loc] = (byCity[loc] || 0) + 1
  }
  console.log('\nTop cities:')
  for (const [city, count] of Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${city}: ${count}`)
  }

  console.log(`\n🚀 Ready to import into Bright Automations: ${OUTPUT_FILE}`)
  console.log('   Go to Admin → Import → Upload this CSV')
  console.log('   Note: Leads have placeholder emails (noemail+...@placeholder.bright.com)')
  console.log('   These are phone-call leads — reps dial, not email.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
