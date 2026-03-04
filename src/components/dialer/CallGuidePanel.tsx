'use client'
import { useState, useEffect } from 'react'
import { useDialer } from './DialerProvider'
import type { CallGuideContent } from '@/types/dialer'

export function CallGuidePanel() {
  const { queue } = useDialer()
  const [guide, setGuide] = useState<CallGuideContent | null>(null)
  const [showAiNotes, setShowAiNotes] = useState(false)

  useEffect(() => {
    fetch('/api/dialer/call-guide').then(r => r.json()).then(d => setGuide(d.content)).catch(err => console.warn('[CallGuidePanel] Call guide fetch failed:', err))
  }, [])

  const lead = queue.selectedLead

  // Variable replacement helper
  const replaceVars = (text: string) => {
    if (!lead || !text) return text
    return text
      .replace(/\{\{firstName\}\}/g, lead.firstName || '')
      .replace(/\{\{lastName\}\}/g, lead.lastName || '')
      .replace(/\{\{companyName\}\}/g, lead.companyName || '')
      .replace(/\{\{industry\}\}/g, lead.industry || '')
      .replace(/\{\{city\}\}/g, lead.city || '')
      .replace(/\{\{state\}\}/g, lead.state || '')
      .replace(/\{\{phone\}\}/g, lead.phone || '')
      .replace(/\{\{[^}]+\}\}/g, '') // Remove unfilled variables
      .replace(/\s+/g, ' ').trim()
  }

  if (!guide) {
    return (
      <div className="p-4 text-sm text-gray-400 dark:text-gray-500 text-center">No call guide configured. Admin can set one in Settings.</div>
    )
  }

  const sections = [
    { title: 'Script', content: guide.script },
    { title: 'Selling Points', content: guide.sellingPoints },
    { title: 'Objection Handling', content: guide.objections },
    { title: 'Upsell Opportunities', content: guide.upsells },
  ]

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Call Guide</h3>
      {sections.map(section => section.content && (
        <div key={section.title}>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{section.title}</h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed bg-white dark:bg-slate-900 rounded-lg p-2.5 border border-gray-100 dark:border-slate-800">
            {replaceVars(section.content)}
          </div>
        </div>
      ))}

      {/* AI Notes (from lead.callScript — shown if exists) */}
      {lead && (
        <div>
          <button
            onClick={() => setShowAiNotes(!showAiNotes)}
            className="text-xs text-purple-600 font-medium hover:text-purple-700"
          >
            {showAiNotes ? 'Hide' : 'Show'} AI Notes
          </button>
          {showAiNotes && (
            <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 bg-purple-50 rounded-lg p-3 border border-purple-100">
              AI-generated talking points will appear here when available.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
