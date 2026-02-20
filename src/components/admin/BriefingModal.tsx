'use client'

import { useState, useEffect } from 'react'
import { X, Users, Flame, MessageSquare, Bot, DollarSign, AlertTriangle } from 'lucide-react'

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  red: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  purple: { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  green: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
}

export function BriefingModal() {
  const [data, setData] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('briefing-shown')) {
      setLoading(false)
      return
    }

    fetch('/api/briefing')
      .then(r => r.json())
      .then(d => {
        if (d.hasAnything) {
          setData(d)
          setOpen(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const dismiss = async () => {
    setOpen(false)
    sessionStorage.setItem('briefing-shown', 'true')
    await fetch('/api/briefing', { method: 'POST' })
  }

  if (!open || !data) return null

  const s = data.sections
  const sinceDate = new Date(data.since)
  const timeAgo = getTimeAgo(sinceDate)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Welcome Back</h2>
              <p className="text-sm text-slate-300 mt-1">Here&apos;s what happened since {timeAgo}</p>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-3">

          {s.newLeads.count > 0 && (
            <BriefingSection
              icon={<Users size={18} />}
              color="blue"
              title={`${s.newLeads.count} New Lead${s.newLeads.count > 1 ? 's' : ''}`}
              items={s.newLeads.items.slice(0, 5).map((l: any) => `${l.firstName} ${l.lastName || ''} — ${l.companyName}`)}
              extra={s.newLeads.count > 5 ? `+${s.newLeads.count - 5} more` : undefined}
            />
          )}

          {s.hotLeads.count > 0 && (
            <BriefingSection
              icon={<Flame size={18} />}
              color="red"
              title={`${s.hotLeads.count} Hot Lead${s.hotLeads.count > 1 ? 's' : ''} — CTA Clicks!`}
              items={s.hotLeads.items.slice(0, 5).map((e: any) => `${e.lead?.firstName} at ${e.lead?.companyName} — ${e.eventType.replace('PREVIEW_', '').replace('_', ' ').toLowerCase()}`)}
              urgent
            />
          )}

          {s.unansweredMessages.count > 0 && (
            <BriefingSection
              icon={<MessageSquare size={18} />}
              color="amber"
              title={`${s.unansweredMessages.count} Message${s.unansweredMessages.count > 1 ? 's' : ''} Waiting`}
              items={s.unansweredMessages.items.slice(0, 5).map((m: any) => `${m.lead?.firstName || m.client?.companyName || 'Unknown'}: "${m.content?.slice(0, 60)}${m.content?.length > 60 ? '...' : ''}"`)}
              urgent
            />
          )}

          {s.aiMessages.count > 0 && (
            <BriefingSection
              icon={<Bot size={18} />}
              color="purple"
              title={`AI Sent ${s.aiMessages.count} Auto-Response${s.aiMessages.count > 1 ? 's' : ''}`}
              items={s.aiMessages.items.slice(0, 3).map((m: any) => `→ ${m.lead?.companyName || 'Unknown lead'}`)}
            />
          )}

          {s.payments.count > 0 && (
            <BriefingSection
              icon={<DollarSign size={18} />}
              color="green"
              title={`$${s.payments.total.toFixed(0)} in Payments (${s.payments.count})`}
              items={s.payments.items.slice(0, 5).map((p: any) => `$${p.amount.toFixed(0)} from ${p.client?.companyName || 'Unknown'}`)}
            />
          )}

          {s.failedSms.count > 0 && (
            <BriefingSection
              icon={<AlertTriangle size={18} />}
              color="red"
              title={`${s.failedSms.count} Failed SMS Deliver${s.failedSms.count > 1 ? 'ies' : 'y'}`}
              items={s.failedSms.items.slice(0, 5).map((m: any) => `Failed to ${m.lead?.companyName || 'Unknown'}: ${m.twilioStatus}`)}
              urgent
            />
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={dismiss}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )
}

function BriefingSection({ icon, color, title, items, extra, urgent }: {
  icon: React.ReactNode
  color: string
  title: string
  items: string[]
  extra?: string
  urgent?: boolean
}) {
  const colors = colorMap[color] || colorMap.blue
  const bgClass = urgent ? `${colors.bg} ${colors.border}` : 'bg-gray-50 border-gray-100'

  return (
    <div className={`p-3.5 rounded-xl border ${bgClass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={colors.text}>{icon}</span>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>
      <div className="space-y-0.5 ml-7">
        {items.map((item, i) => (
          <div key={i} className="text-xs text-gray-600">{item}</div>
        ))}
        {extra && <div className="text-xs text-gray-400 mt-1">{extra}</div>}
      </div>
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
