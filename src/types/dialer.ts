// DialerCall matches the Prisma model
export interface DialerCall {
  id: string
  leadId: string
  repId: string
  sessionId?: string
  twilioCallSid?: string
  status: 'INITIATED' | 'RINGING' | 'CONNECTED' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY' | 'VOICEMAIL'
  direction: 'OUTBOUND' | 'INBOUND'
  startedAt: string
  connectedAt?: string
  endedAt?: string
  duration?: number
  dispositionResult?: string
  dispositionPath?: unknown[]
  wasRecommended: boolean
  previewSentDuringCall: boolean
  previewSentChannel?: string
  previewOpenedDuringCall: boolean
  ctaClickedDuringCall: boolean
  vmDropped: boolean
  vmDroppedAt?: string
  notes?: string
  phoneNumberUsed?: string
  amdResult?: string
}

export interface DialerSession {
  id: string
  repId: string
  startedAt: string
  endedAt?: string
  isActive: boolean
  autoDialEnabled: boolean
  totalCalls: number
  connectedCalls: number
  voicemails: number
  noAnswers: number
  avgCallDuration: number
  previewsSent: number
  previewsOpened: number
  ctaClicks: number
  callbacksScheduled: number
  interestedCount: number
  notInterestedCount: number
}

export interface QueueLead {
  id: string
  companyName: string
  contactName?: string
  firstName?: string
  lastName?: string
  phone: string
  secondaryPhone?: string
  email?: string
  status: string
  priority: string
  city?: string
  state?: string
  industry?: string
  ownerRepId?: string
  previewId?: string
  previewUrl?: string
  _count?: { dialerCalls: number }
}

export interface CallbackItem {
  id: string
  leadId: string
  repId: string
  scheduledAt: string
  completedAt?: string
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED'
  notes?: string
  lead?: { id: string; companyName: string; contactName?: string; phone: string; firstName?: string; lastName?: string }
}

export interface DispositionNode {
  id: string
  question: string
  optionA: { label: string; next?: DispositionNode | string }
  optionB: { label: string; next?: DispositionNode | string }
}

export interface Recommendation {
  outcome: string
  confidence: number
  reason: string
}

export interface SSEEvent {
  type: 'CALL_STATUS' | 'PREVIEW_SENT' | 'PREVIEW_OPENED' | 'CTA_CLICKED' | 'RECOMMENDATION_UPDATE' | 'QUEUE_UPDATE' | 'INBOUND_CALL' | 'SESSION_UPDATE' | 'VM_DROP_COMPLETE' | 'DISPOSITION_LOGGED'
  data: Record<string, unknown>
  timestamp: string
}

export interface UpsellTag {
  id: string
  leadId: string
  productId: string
  productName: string
  productPrice: number
  addedByRepId: string
  callId?: string
  taggedAt: string
  removedAt?: string
}

export interface UpsellProduct {
  id: string
  name: string
  price: number
  description?: string
}

export interface CallGuideContent {
  script?: string
  sellingPoints?: string
  objections?: string
  upsells?: string
}

export interface LiveFeedItem {
  id: string
  type: 'PREVIEW_OPENED' | 'CTA_CLICKED' | 'PREVIEW_SENT' | 'CALL_STATUS'
  data: Record<string, unknown>
  timestamp: string
}

// Disposition tree outcomes
export type DispositionOutcome =
  | 'WANTS_TO_MOVE_FORWARD'
  | 'NOT_INTERESTED'
  | 'CALLBACK'
  | 'INTERESTED_VERBAL'
  | 'WANTS_CHANGES'
  | 'WILL_LOOK_LATER'
  | 'DNC'
  | 'NO_ANSWER'
  | 'VOICEMAIL'
  | 'WRONG_NUMBER'
  | 'DISCONNECTED'
