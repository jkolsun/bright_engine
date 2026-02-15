import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPhone(phone: string): string {
  // Format as (123) 456-7890
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phone
}

export function canSendMessage(timezone: string = 'America/New_York'): boolean {
  try {
    // Use Intl API to get the hour in the lead's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const hour = parseInt(formatter.format(new Date()))
    return hour >= 8 && hour < 21
  } catch {
    // Fallback: assume safe to send during typical business hours
    const hour = new Date().getUTCHours()
    // Rough EST assumption: UTC-5
    const estHour = (hour - 5 + 24) % 24
    return estHour >= 8 && estHour < 21
  }
}

export function getTimezoneFromState(state: string): string {
  // Comprehensive state -> timezone mapping
  const timezones: Record<string, string> = {
    // Eastern
    NY: 'America/New_York', FL: 'America/New_York', PA: 'America/New_York',
    OH: 'America/New_York', GA: 'America/New_York', NC: 'America/New_York',
    VA: 'America/New_York', SC: 'America/New_York', ME: 'America/New_York',
    NH: 'America/New_York', VT: 'America/New_York', MA: 'America/New_York',
    RI: 'America/New_York', CT: 'America/New_York', NJ: 'America/New_York',
    DE: 'America/New_York', MD: 'America/New_York', WV: 'America/New_York',
    MI: 'America/Detroit', IN: 'America/Indiana/Indianapolis', KY: 'America/Kentucky/Louisville',
    
    // Central
    TX: 'America/Chicago', IL: 'America/Chicago', MO: 'America/Chicago',
    MN: 'America/Chicago', WI: 'America/Chicago', IA: 'America/Chicago',
    AR: 'America/Chicago', LA: 'America/Chicago', MS: 'America/Chicago',
    AL: 'America/Chicago', TN: 'America/Chicago', OK: 'America/Chicago',
    KS: 'America/Chicago', NE: 'America/Chicago', SD: 'America/Chicago',
    ND: 'America/Chicago',
    
    // Mountain
    CO: 'America/Denver', WY: 'America/Denver', MT: 'America/Denver',
    NM: 'America/Denver', UT: 'America/Denver', ID: 'America/Denver',
    AZ: 'America/Phoenix', // No DST
    
    // Pacific
    CA: 'America/Los_Angeles', WA: 'America/Los_Angeles', OR: 'America/Los_Angeles',
    NV: 'America/Los_Angeles',
    
    // Alaska & Hawaii
    AK: 'America/Anchorage',
    HI: 'Pacific/Honolulu',
  }

  return timezones[state?.toUpperCase()] || 'America/New_York'
}

export function generatePreviewId(): string {
  // Generate unique preview ID
  return `prv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function parseWebsite(website: string): string {
  // Clean up website URL
  if (!website) return ''
  if (!website.startsWith('http')) {
    return `https://${website}`
  }
  return website
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}
