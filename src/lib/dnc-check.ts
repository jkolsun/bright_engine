/**
 * Shared DNC (Do Not Call) check utility.
 * Used by Bug 1 (SMS), Bug 2 (inbound SMS), Bug 3 (dial time).
 * Checks both Lead.dncAt field AND DoNotCall table.
 * If DoNotCall record exists but Lead.dncAt is null, fixes the inconsistency.
 */

import { prisma } from './db'

export async function isDNC(phone: string, leadId?: string): Promise<boolean> {
  // Check 1: Lead.dncAt field (fastest check)
  if (leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { dncAt: true, status: true },
    })
    if (lead?.dncAt || lead?.status === 'DO_NOT_CONTACT') {
      return true
    }
  }

  // Check 2: DoNotCall table (covers cases where DNC was set by phone, not by lead)
  const normalizedPhone = normalizePhone(phone)
  const dncRecord = await prisma.doNotCall.findFirst({
    where: {
      OR: [
        { phone },
        { phone: normalizedPhone },
      ],
    },
  })

  if (dncRecord) {
    // Fix inconsistency: DoNotCall exists but Lead.dncAt was null
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: { dncAt: new Date(), status: 'DO_NOT_CONTACT' },
      }).catch(() => { /* non-critical — lead may have been deleted */ })
    }
    return true
  }

  return false
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  if (digits.length === 10) {
    return `+1${digits}`
  }
  return phone.startsWith('+') ? phone : `+${digits}`
}
