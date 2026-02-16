/**
 * CSV Parser for Lead Imports
 * Validates and transforms CSV data into Lead records
 */

export interface RawLeadRow {
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  companyName?: string
  company_name?: string
  company?: string
  email?: string
  phone?: string
  company_phone?: string
  industry?: string
  city?: string
  state?: string
  website?: string
  campaign?: string
  source?: string
}

export interface ParsedLead {
  firstName: string
  lastName: string
  email: string
  phone: string
  companyName: string
  industry: string
  city?: string
  state?: string
  website?: string
  campaign?: string
  source: string
  errors: string[]
  isValid: boolean
}

const VALID_INDUSTRIES = [
  'RESTORATION',
  'ROOFING',
  'PLUMBING',
  'HVAC',
  'PAINTING',
  'LANDSCAPING',
  'ELECTRICAL',
  'GENERAL_CONTRACTING',
  'CLEANING',
  'PEST_CONTROL',
  'LAW',
  'LAW_PRACTICE',
  'LEGAL',
  'LEGAL_SERVICES',
  'CONSULTING',
  'TECHNOLOGY',
  'FINANCE',
  'HEALTHCARE',
  'REAL_ESTATE',
  'CONSTRUCTION',
  'MANUFACTURING',
  'RETAIL',
  'HOSPITALITY',
  'TRANSPORTATION',
  'EDUCATION',
  'NONPROFIT',
]

const PHONE_REGEX = /^\+?1?\d{10,14}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizePhone(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length < 10) return null
  if (cleaned.length === 10) return `+1${cleaned}`
  if (cleaned.length === 11 && cleaned[0] === '1') return `+${cleaned}`
  if (cleaned.length === 11) return `+1${cleaned.slice(1)}`
  return `+${cleaned}`
}

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  return EMAIL_REGEX.test(trimmed) ? trimmed : null
}

function normalizeIndustry(industry: string): string | null {
  if (!industry) return null
  const normalized = industry.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '')
  // Accept any normalized industry (not just hardcoded list)
  return normalized || null
}

export function parseLead(row: RawLeadRow): ParsedLead {
  const errors: string[] = []

  // Extract fields (handle both formats: firstName/first_name)
  const firstName = (row.firstName || row.first_name || '').trim()
  const lastName = (row.lastName || row.last_name || '').trim()
  const companyName = (
    row.companyName ||
    row.company_name ||
    row.company ||
    ''
  ).trim()
  const email = (row.email || '').trim()
  const phone = (row.phone || row.company_phone || '').trim()
  const industry = (row.industry || '').trim()
  const city = (row.city || '').trim()
  const state = (row.state || '').trim()
  const website = (row.website || '').trim()
  const campaign = (row.campaign || '').trim()
  const source = (row.source || 'CSV_IMPORT').trim()

  // Validate required fields
  if (!firstName) errors.push('First name is required')
  if (!companyName) errors.push('Company name is required')

  const normalizedPhone = normalizePhone(phone)
  if (!normalizedPhone) errors.push('Phone must be a valid 10-14 digit number')

  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) errors.push('Email must be valid (name@domain.com)')

  const normalizedIndustry = normalizeIndustry(industry)
  // Industry is optional - use GENERAL_CONTRACTING as fallback if not provided
  // This allows CSVs without industry field to still import

  return {
    firstName,
    lastName: lastName || 'Unknown',
    email: normalizedEmail || '',
    phone: normalizedPhone || '',
    companyName,
    industry: normalizedIndustry || 'GENERAL_CONTRACTING',
    city,
    state,
    website: website || undefined,
    campaign: campaign || undefined,
    source,
    errors,
    isValid: errors.length === 0,
  }
}

/**
 * Proper CSV parsing that handles quoted fields with commas
 * Matches RFC 4180 CSV format
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ""
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget last field
  result.push(current.trim())
  return result
}

export function parseCSV(csvContent: string): {
  leads: ParsedLead[]
  totalRows: number
  validCount: number
  invalidCount: number
  errors: Map<number, string[]>
} {
  const lines = csvContent.split('\n').filter((line) => line.trim())
  if (lines.length === 0) {
    return {
      leads: [],
      totalRows: 0,
      validCount: 0,
      invalidCount: 0,
      errors: new Map(),
    }
  }

  // Parse header (first row)
  const headerLine = lines[0]
  const headerValues = parseCSVLine(headerLine)
  const headers = headerValues.map((h) =>
    h.toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
  )

  const errors = new Map<number, string[]>()
  const leads: ParsedLead[] = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)

    const row: RawLeadRow = {}
    for (let j = 0; j < headers.length && j < values.length; j++) {
      const header = headers[j]
      const value = values[j]
        .replace(/^["']|["']$/g, '') // Remove surrounding quotes
        .trim()
      row[header as keyof RawLeadRow] = value
    }

    const parsed = parseLead(row)
    leads.push(parsed)

    if (!parsed.isValid) {
      errors.set(i, parsed.errors)
    }
  }

  return {
    leads,
    totalRows: lines.length - 1,
    validCount: leads.filter((l) => l.isValid).length,
    invalidCount: leads.filter((l) => !l.isValid).length,
    errors,
  }
}
