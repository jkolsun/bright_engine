'use client'
import { useState } from 'react'
import { useDialer } from './DialerProvider'
import type { QueueLead } from '@/types/dialer'
import { Send, ExternalLink } from 'lucide-react'

export function PreviewButton({ lead }: { lead: QueueLead }) {
  const { currentCall } = useDialer()
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Preview</h3>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSend}
          disabled={sending || !lead.previewUrl && !lead.previewId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          {sent ? 'Sent!' : sending ? 'Sending...' : 'Text Preview'}
        </button>
        {(lead.previewUrl || lead.previewId) && (
          <a
            href={lead.previewUrl || `${window.location.origin}/preview/${lead.previewId}`}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
          >
            <ExternalLink className="w-3 h-3" /> View
          </a>
        )}
      </div>
    </div>
  )
}
