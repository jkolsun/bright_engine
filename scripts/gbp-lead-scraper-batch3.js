#!/usr/bin/env node

/**
 * GBP Lead Scraper — Batch 3
 * Same verticals (roofing, tree service, painting), DIFFERENT cities than Batch 1 & 2.
 * 
 * Usage: SERPAPI_KEY=your_key node gbp-lead-scraper-batch3.js
 */

const fs = require('fs')

const SERPAPI_KEY = process.env.SERPAPI_KEY
if (!SERPAPI_KEY) {
  console.error('❌ SERPAPI_KEY environment variable is required.')
  process.exit(1)
}

const TARGET_LEADS = parseInt(process.env.TARGET_LEADS || '150', 10)
const today = new Date().toISOString().split('T')[0]
const OUTPUT_FILE = process.env.OUTPUT_FILE || `gbp-leads-batch3-${today}.csv`

// DIFFERENT cities from batch 1 AND batch 2 — zero overlap
const CITIES = [
  'Portland OR',
  'Tucson AZ',
  'Corpus Christi TX',
  'Lubbock TX',
  'Laredo TX',
  'McAllen TX',
  'Amarillo TX',
  'Springfield MO',
  'Fort Wayne IN',
  'Grand Rapids MI',
  'Lansing MI',
  'Toledo OH',
  'Youngstown OH',
  'Topeka KS',
  'Lincoln NE',
  'Sioux Falls SD',
  'Rapid City SD',
  'Fargo ND',
  'Billings MT',
  'Reno NV',
  'Provo UT',
  'Colorado Springs CO',
  'Pueblo CO',
  'Roanoke VA',
  'Norfolk VA',
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

function buildSearchQueries() {
  const queries = []
  for (const vertical of VERTICALS) {
    for (const city of CITIES) {
      queries.push(`${vertical} ${city}`)
    }
  }
  return queries.sort(() => Math.random() - 0.5)
}

async function searchGoogleMaps(query) {
  const params = new URLSearchParams({
    api_key: SERPAPI_KEY,
    engine: 'google_maps',
    q: query,
    type: 'search',
  })
  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
    signal: AbortSignal.timeout(30000),
  })
  if (!response.ok) throw new Error(`SerpAPI error ${response.status}: ${await response.text()}`)
  return response.json()
}

function extractLeadsFromResults(data, query) {
  const results = data.local_results || []
  const leads = []
  for (const r of results) {
    if (r.website) continue
    const phone = r.phone
    if (!phone) continue
    const businessName = (r.title || '').trim()
    if (!businessName) continue

    const address = r.address || ''
    const addressParts = address.split(',').map(s => s.trim())
    let city = '', state = ''
    if (addressParts.length >= 2) {
      city = addressParts[addressParts.length - 2] || ''
      const lastPart = addressParts[addressParts.length - 1] || ''
      const stateMatch = lastPart.match(/([A-Z]{2})/)
      state = stateMatch ? stateMatch[1] : ''
    }

    const queryLower = query.toLowerCase()
    let industry = 'GENERAL_CONTRACTING'
    if (queryLower.includes('roof')) industry = 'ROOFING'
    else if (queryLower.includes('tree')) industry = 'LANDSCAPING'
    else if (queryLower.includes('paint')) industry = 'PAINTING'

    leads.push({
      firstName: '',
      lastName: '',
      companyName: businessName,
      email: '',
      phone,
      industry,
      city,
      state,
      website: '',
      campaign: 'GBP_NO_WEBSITE',
      source: 'GBP_SCRAPE',
      _rating: r.rating || '',
      _reviews: r.reviews || '',
      _address: address,
      _gpsCoordinates: r.gps_coordinates ? `${r.gps_coordinates.latitude},${r.gps_coordinates.longitude}` : '',
      _searchQuery: query,
    })
  }
  return leads
}

function deduplicateLeads(leads) {
  const seen = new Set()
  return leads.filter(lead => {
    const normalizedPhone = lead.phone.replace(/\D/g, '')
    if (seen.has(normalizedPhone)) return false
    seen.add(normalizedPhone)
    return true
  })
}

function escapeCSV(value) {
  const str = String(value || '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
  return str
}

function writeCSV(leads, filename) {
  const importColumns = ['firstName', 'lastName', 'companyName', 'email', 'phone', 'industry', 'city', 'state', 'website', 'campaign', 'source']
  const extraColumns = ['_rating', '_reviews', '_address', '_gpsCoordinates', '_searchQuery']
  const allColumns = [...importColumns, ...extraColumns]
  const header = allColumns.join(',')
  const rows = leads.map(lead => allColumns.map(col => escapeCSV(lead[col])).join(','))
  fs.writeFileSync(filename, [header, ...rows].join('\n'), 'utf-8')
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  GBP Lead Scraper — BATCH 3                        ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  console.log(`Target: ${TARGET_LEADS} leads | Output: ${OUTPUT_FILE}`)
  console.log(`Cities: ${CITIES.length} | Verticals: ${VERTICALS.length} | Queries: ${CITIES.length * VERTICALS.length}\n`)

  const queries = buildSearchQueries()
  let allLeads = [], queriesUsed = 0, totalResultsScanned = 0

  for (const query of queries) {
    if (allLeads.length >= TARGET_LEADS) { console.log(`\n✅ Reached target of ${TARGET_LEADS} leads.`); break }
    queriesUsed++
    process.stdout.write(`[${queriesUsed}] "${query}" ... `)
    try {
      const data = await searchGoogleMaps(query)
      const totalResults = (data.local_results || []).length
      const leads = extractLeadsFromResults(data, query)
      totalResultsScanned += totalResults
      allLeads.push(...leads)
      console.log(`${totalResults} results → ${leads.length} no-website (total: ${allLeads.length})`)
      await new Promise(r => setTimeout(r, 250))
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
      if (err.message.includes('429')) { console.log('   ⏳ Rate limited, waiting 5s...'); await new Promise(r => setTimeout(r, 5000)) }
    }
  }

  const uniqueLeads = deduplicateLeads(allLeads)
  console.log(`\n────────────────────────────────────────`)
  console.log(`Queries used:     ${queriesUsed} credits`)
  console.log(`Results scanned:  ${totalResultsScanned}`)
  console.log(`After dedup:      ${uniqueLeads.length}`)
  console.log(`────────────────────────────────────────`)

  if (uniqueLeads.length === 0) { console.log('\n⚠️  No leads found.'); process.exit(0) }

  writeCSV(uniqueLeads, OUTPUT_FILE)
  console.log(`\n✅ Wrote ${uniqueLeads.length} leads to ${OUTPUT_FILE}`)

  const byIndustry = {}
  for (const l of uniqueLeads) byIndustry[l.industry] = (byIndustry[l.industry] || 0) + 1
  console.log('\nIndustry breakdown:')
  for (const [ind, count] of Object.entries(byIndustry).sort((a, b) => b[1] - a[1])) console.log(`  ${ind}: ${count}`)

  const byCity = {}
  for (const l of uniqueLeads) byCity[l.city || 'Unknown'] = (byCity[l.city || 'Unknown'] || 0) + 1
  console.log('\nTop cities:')
  for (const [c, count] of Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${c}: ${count}`)

  console.log(`\n🚀 Upload to Bright: Admin → Import → ${OUTPUT_FILE}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
