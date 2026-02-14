import { prisma } from './db'
import { dispatchWebhook, WebhookEvents } from './webhook-dispatcher'

/**
 * Process incoming messages and detect if they're client questions
 */
export async function processIncomingMessage(
  phone: string, 
  content: string, 
  channel: string = 'SMS'
): Promise<void> {
  try {
    // Find client by phone number
    const lead = await prisma.lead.findFirst({
      where: { phone },
      include: { client: true }
    })

    if (!lead) {
      console.log(`📱 Message from unknown number: ${phone}`)
      return
    }

    // Create message record
    const message = await prisma.message.create({
      data: {
        leadId: lead.id,
        clientId: lead.client?.id,
        content,
        direction: 'INBOUND',
        channel: channel as any,
        senderType: lead.client ? 'CLIENT' : 'LEAD',
        senderName: lead.firstName || 'Unknown',
        recipient: phone,
      }
    })

    // Detect if this is a question/support request
    const isQuestion = detectQuestion(content)
    
    if (isQuestion && lead.client) {
      console.log(`❓ Client question detected from ${lead.companyName}`)
      
      // 🚀 Dispatch webhook for immediate client support
      await dispatchWebhook(WebhookEvents.CLIENT_QUESTION(
        lead.client.id,
        content,
        phone,
        channel
      ))

      // Create notification for Andrew
      await prisma.notification.create({
        data: {
          type: 'CLIENT_TEXT',
          title: 'Client Question',
          message: `${lead.companyName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
          metadata: {
            leadId: lead.id,
            clientId: lead.client.id,
            phone,
            messageId: message.id
          }
        }
      })
    }

    console.log(`📨 Message processed: ${lead.companyName} - "${content.substring(0, 50)}..."`)

  } catch (error) {
    console.error('❌ Message processing error:', error)
  }
}

/**
 * Simple question detection using keywords and patterns
 */
function detectQuestion(content: string): boolean {
  const lowerContent = content.toLowerCase()
  
  // Question indicators
  const questionWords = [
    'how', 'what', 'when', 'where', 'why', 'who', 'which', 'can you', 'could you',
    'help', 'support', 'issue', 'problem', 'broken', 'not working', 'error'
  ]
  
  // Check for question mark
  if (content.includes('?')) return true
  
  // Check for question words at start of sentence
  const words = lowerContent.split(' ')
  if (questionWords.includes(words[0])) return true
  
  // Check for help keywords
  const helpKeywords = ['help', 'support', 'issue', 'problem', 'broken', 'error', 'bug']
  if (helpKeywords.some(keyword => lowerContent.includes(keyword))) return true
  
  return false
}

/**
 * Call this function from your Twilio webhook or SMS receiver
 */
export async function handleIncomingSMS(
  from: string,
  body: string,
  messageId?: string
): Promise<void> {
  console.log(`📱 Incoming SMS from ${from}: ${body}`)
  await processIncomingMessage(from, body, 'SMS')
}