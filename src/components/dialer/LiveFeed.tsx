'use client'
import { useDialer } from './DialerProvider'
import { Eye, MousePointer, Send, Phone } from 'lucide-react'

const iconMap: Record<string, any> = {
  PREVIEW_OPENED: Eye,
  CTA_CLICKED: MousePointer,
  PREVIEW_SENT: Send,
  CALL_STATUS: Phone,
}

export function LiveFeed() {
  const { sse } = useDialer()

  if (sse.liveFeed.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Live Activity</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {sse.liveFeed.slice(0, 10).map(item => {
          const Icon = iconMap[item.type] || Phone
          return (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <Icon className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400">
                {item.type === 'PREVIEW_OPENED' && 'Preview opened'}
                {item.type === 'CTA_CLICKED' && 'CTA clicked!'}
                {item.type === 'PREVIEW_SENT' && 'Preview sent'}
                {item.type === 'CALL_STATUS' && `Call: ${(item.data as any).status}`}
              </span>
              <span className="text-gray-400 dark:text-gray-500 ml-auto">{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
