'use client'
import { useState } from 'react'
import { useDialer } from './DialerProvider'
import type { QueueLead } from '@/types/dialer'
import { Send, Mail, ExternalLink } from 'lucide-react'

export function PreviewButton({ lead }: { lead: QueueLead }) {
  const { currentCall } = useDialer()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [sentEmail, setSentEmail] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      await fetch('/api/dialer/preview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, callId: currentCall?.id, channel: 'sms' }),
      })
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {} finally { setSending(false) }
  }

  const handleSendEmail = async () => {
    setSendingEmail(true)
    try {
      const res = await fetch('/api/dialer/preview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, callId: currentCall?.id, channel: 'email' }),
      })
      const data = await res.json()
      if (data.success) {
        setSentEmail(true)
        setTimeout(() => setSentEmail(false), 3000)
      }
    } catch {} finally { setSendingEmail(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Preview</h3>
      <div className="flex items-center gap-2.5">
        <button
          onClick={handleSend}
          disabled={sending || !lead.previewUrl && !lead.previewId}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 border border-teal-200/60 disabled:opacity-40 transition-all duration-200"
        >
          <Send className="w-3.5 h-3.5" />
          {sent ? 'Sent!' : sending ? 'Sending...' : 'Text Preview'}
        </button>
        <button
          onClick={handleSendEmail}
          disabled={sendingEmail || !lead.email || (!lead.previewUrl && !lead.previewId)}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 border border-blue-200/60 disabled:opacity-40 transition-all duration-200"
        >
          <Mail className="w-3.5 h-3.5" />
          {sentEmail ? 'Sent!' : sendingEmail ? 'Sending...' : 'Email Preview'}
        </button>
        {(lead.previewUrl || lead.previewId) && (
          <a
            href={lead.previewUrl || `${window.location.origin}/preview/${lead.previewId}`}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-all duration-200"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View
          </a>
        )}
      </div>
    </div>
  )
}
