/**
 * CSV Parser Tests
 * Validates CSV import and data validation
 */

import { parseLead, parseCSV } from '@/lib/csv-parser'

describe('CSV Parser', () => {
  it('should parse valid lead', () => {
    const row = {
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      phone: '5551234567',
      industry: 'ROOFING',
      city: 'New York',
      state: 'NY',
    }

    const result = parseLead(row)

    expect(result.isValid).toBe(true)
    expect(result.firstName).toBe('John')
    expect(result.companyName).toBe('Acme Corp')
    expect(result.email).toBe('john@acme.com')
    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid email', () => {
    const row = {
      firstName: 'John',
      companyName: 'Acme Corp',
      email: 'not-an-email',
      phone: '5551234567',
      industry: 'ROOFING',
    }

    const result = parseLead(row)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Email must be valid (name@domain.com)')
  })

  it('should reject invalid phone', () => {
    const row = {
      firstName: 'John',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      phone: '123', // Too short
      industry: 'ROOFING',
    }

    const result = parseLead(row)

    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(
      'Phone must be a valid 10-14 digit number'
    )
  })

  it('should normalize phone numbers', () => {
    const testCases = [
      { input: '5551234567', expected: '+15551234567' },
      { input: '(555) 123-4567', expected: '+15551234567' },
      { input: '+1 555 123 4567', expected: '+15551234567' },
    ]

    for (const { input, expected } of testCases) {
      const row = {
        firstName: 'John',
        companyName: 'Acme',
        email: 'john@acme.com',
        phone: input,
        industry: 'ROOFING',
      }

      const result = parseLead(row)

      expect(result.phone).toBe(expected)
    }
  })

  it('should parse full CSV', () => {
    const csv = `firstName,lastName,companyName,email,phone,industry,city,state
John,Doe,Acme Corp,john@acme.com,5551234567,ROOFING,New York,NY
Jane,Smith,BuildCo,jane@build.com,5559876543,HVAC,Los Angeles,CA
`

    const result = parseCSV(csv)

    expect(result.totalRows).toBe(2)
    expect(result.validCount).toBe(2)
    expect(result.invalidCount).toBe(0)
    expect(result.leads).toHaveLength(2)
  })

  it('should identify invalid rows', () => {
    const csv = `firstName,lastName,companyName,email,phone,industry
John,Doe,Acme Corp,invalid-email,555,ROOFING
Jane,,BuildCo,jane@build.com,5559876543,UNKNOWN_INDUSTRY
`

    const result = parseCSV(csv)

    expect(result.invalidCount).toBeGreaterThan(0)
    expect(result.errors.size).toBeGreaterThan(0)
  })
})
