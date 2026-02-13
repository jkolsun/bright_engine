import { prisma } from './db'
import { logActivity } from './logging'

/**
 * Escalation Gates Framework
 * 10 no-exception gates that require Andrew's approval
 * Everything else operates autonomously
 */

export type EscalationGateType =
  | 'SITE_PUBLICATION' // Client site going live
  | 'CLIENT_REFUND' // Any refund request
  | 'PRICING_CHANGE' // Custom pricing/discounts >20%
  | 'ANGRY_CLIENT' // Escalated complaint/churn risk
  | 'LEAD_DELETION' // Soft-delete lead from system
  | 'STRIPE_REFUND' // Refund from Stripe
  | 'BULK_SEND' // Send to >100 leads at once
  | 'TIMELINE_OVERRIDE' // Rush/expedited timeline
  | 'EXTERNAL_DATA_IMPORT' // Import data from external source
  | 'SYSTEM_RULE_CHANGE' // Modify approval gates or system rules

export interface EscalationRequest {
  id?: string
  gateType: EscalationGateType
  title: string
  description: string
  context?: Record<string, any>
  relatedId?: string // leadId, clientId, etc.
  createdBy?: string // repId or userId who triggered
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string // Andrew's userId
  approvalNote?: string
  createdAt?: Date
  approvedAt?: Date
}

/**
 * Check if an action requires escalation
 */
export function requiresEscalation(
  gateType: EscalationGateType,
  context?: Record<string, any>
): boolean {
  // All gates are mandatory - no exceptions
  return true
}

/**
 * Create an escalation request
 * Blocks the action until approved
 */
export async function createEscalation(
  request: EscalationRequest
): Promise<{
  success: boolean
  escalationId?: string
  error?: string
}> {
  try {
    // Store in notes/metadata temporarily (could use dedicated table)
    const escalation = {
      id: `esc-${Date.now()}`,
      ...request,
      status: 'PENDING' as const,
      createdAt: new Date(),
    }

    // Log as critical activity
    await logActivity(
      'ESCALATION',
      `🚨 ESCALATION: ${request.gateType} - ${request.title}`,
      {
        metadata: escalation,
      }
    )

    // In production: store in database, send alert to Andrew
    console.log(`[ESCALATION] ${request.gateType}: ${request.title}`)

    return {
      success: true,
      escalationId: escalation.id,
    }
  } catch (error) {
    console.error('Escalation creation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * The 10 Escalation Gates - NO EXCEPTIONS
 */

// Gate 1: Site Publication
export async function checkSitePublication(clientId: string): Promise<boolean> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  })

  if (!client) return false

  // If site not yet live, require approval before publication
  if (!client.siteLiveDate) {
    await createEscalation({
      gateType: 'SITE_PUBLICATION',
      title: `Site publication for ${client.companyName}`,
      description: `Client ${client.companyName} site is being published for the first time`,
      relatedId: clientId,
      status: 'PENDING',
    })
    return false
  }

  return true
}

// Gate 2: Client Refund
export async function checkClientRefund(
  clientId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  await createEscalation({
    gateType: 'CLIENT_REFUND',
    title: `Refund request: $${amount}`,
    description: `Refund of $${amount} requested for client. Reason: ${reason}`,
    relatedId: clientId,
    status: 'PENDING',
    context: { amount, reason },
  })

  return false // Block until approved
}

// Gate 3: Pricing Change
export async function checkPricingChange(
  clientId: string,
  originalPrice: number,
  newPrice: number,
  reason: string
): Promise<boolean> {
  const percentChange = ((newPrice - originalPrice) / originalPrice) * 100

  // >20% discount requires approval
  if (percentChange < -20) {
    await createEscalation({
      gateType: 'PRICING_CHANGE',
      title: `Pricing change: ${percentChange.toFixed(1)}%`,
      description: `Custom pricing request. Original: $${originalPrice}, New: $${newPrice}. Reason: ${reason}`,
      relatedId: clientId,
      status: 'PENDING',
      context: { originalPrice, newPrice, percentChange },
    })

    return false
  }

  return true
}

// Gate 4: Angry Client / Churn Risk
export async function checkAngryClient(
  clientId: string,
  riskLevel: 'HIGH' | 'MEDIUM',
  complaint: string
): Promise<boolean> {
  if (riskLevel === 'HIGH') {
    await createEscalation({
      gateType: 'ANGRY_CLIENT',
      title: `HIGH churn risk: ${complaint.substring(0, 50)}...`,
      description: complaint,
      relatedId: clientId,
      status: 'PENDING',
      context: { riskLevel },
    })

    return false
  }

  return true
}

// Gate 5: Lead Deletion
export async function checkLeadDeletion(
  leadId: string,
  reason: string
): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  })

  if (!lead) return true // Already deleted

  await createEscalation({
    gateType: 'LEAD_DELETION',
    title: `Delete lead: ${lead.companyName}`,
    description: `Request to delete lead. Reason: ${reason}`,
    relatedId: leadId,
    status: 'PENDING',
    context: { reason },
  })

  return false // Block soft-delete until approved
}

// Gate 6: Stripe Refund
export async function checkStripeRefund(
  paymentId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  await createEscalation({
    gateType: 'STRIPE_REFUND',
    title: `Stripe refund: $${amount}`,
    description: `Refund in Stripe. Reason: ${reason}`,
    relatedId: paymentId,
    status: 'PENDING',
    context: { amount, reason },
  })

  return false // Block until approved
}

// Gate 7: Bulk Send (>100 leads)
export async function checkBulkSend(
  leadCount: number,
  campaignName: string
): Promise<boolean> {
  if (leadCount > 100) {
    await createEscalation({
      gateType: 'BULK_SEND',
      title: `Bulk send: ${leadCount} leads`,
      description: `Sending to ${leadCount} leads in campaign "${campaignName}"`,
      status: 'PENDING',
      context: { leadCount, campaignName },
    })

    return false // Block until approved
  }

  return true
}

// Gate 8: Timeline Override (rush/expedited)
export async function checkTimelineOverride(
  clientId: string,
  requestedDays: number
): Promise<boolean> {
  if (requestedDays < 7) {
    await createEscalation({
      gateType: 'TIMELINE_OVERRIDE',
      title: `Expedited timeline: ${requestedDays} days`,
      description: `Client requesting site in ${requestedDays} days (normal: 14 days)`,
      relatedId: clientId,
      status: 'PENDING',
      context: { requestedDays },
    })

    return false // Block until approved
  }

  return true
}

// Gate 9: External Data Import
export async function checkExternalDataImport(
  sourceType: string,
  recordCount: number
): Promise<boolean> {
  await createEscalation({
    gateType: 'EXTERNAL_DATA_IMPORT',
    title: `Import ${recordCount} records from ${sourceType}`,
    description: `Importing ${recordCount} records from external source: ${sourceType}`,
    status: 'PENDING',
    context: { sourceType, recordCount },
  })

  return false // Block until approved
}

// Gate 10: System Rule Change
export async function checkSystemRuleChange(
  ruleType: string,
  oldValue: any,
  newValue: any
): Promise<boolean> {
  await createEscalation({
    gateType: 'SYSTEM_RULE_CHANGE',
    title: `System rule change: ${ruleType}`,
    description: `Rule change detected. Type: ${ruleType}. Old: ${JSON.stringify(oldValue)}, New: ${JSON.stringify(newValue)}`,
    status: 'PENDING',
    context: { ruleType, oldValue, newValue },
  })

  return false // Block until approved
}
