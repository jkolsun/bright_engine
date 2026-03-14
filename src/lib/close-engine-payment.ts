// TEARDOWN: Payment link generation and sending gutted.
// Was: Stripe checkout session creation, payment link sending with approval flow,
// payment follow-up message scheduling.
// Setting Engine spec will replace with Cal.com booking link logic.

export async function generatePaymentLink(_leadId: string): Promise<string> {
  console.log('[CLOSE_ENGINE] generatePaymentLink disabled — teardown')
  return ''
}

export async function sendPaymentLink(_conversationId: string): Promise<{ success: boolean }> {
  console.log('[CLOSE_ENGINE] sendPaymentLink disabled — teardown')
  return { success: true }
}

export async function getPaymentFollowUpMessage(
  _hoursSinceSent: number,
  _firstName: string
): Promise<{ message: string; threshold: string } | null> {
  // TEARDOWN: No payment follow-ups. Settings key never existed anyway.
  return null
}
