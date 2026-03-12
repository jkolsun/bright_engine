'use client'

import { useState } from 'react'
import { Loader2, Rocket } from 'lucide-react'

interface LaunchPanelProps {
  leadId: string
  onDone: () => void
}

export default function LaunchPanel({ leadId, onDone }: LaunchPanelProps) {
  const [domain, setDomain] = useState('')
  const [launching, setLaunching] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string; instructions?: string } | null>(null)

  const launchSite = async () => {
    if (!domain.trim()) return
    setLaunching(true)
    setResult(null)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, instructions: data.instructions })
        onDone()
      } else {
        setResult({ error: data.error || 'Failed to launch' })
      }
    } catch {
      setResult({ error: 'Network error' })
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Domain</label>
      <input
        type="text"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="www.johnsonroofing.com"
        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-gray-100"
        disabled={launching}
      />
      <button
        onClick={launchSite}
        disabled={launching || !domain.trim()}
        className="mt-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {launching ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
        {launching ? 'Launching...' : 'Launch Site'}
      </button>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'}`}>
          {result.error || result.instructions}
        </div>
      )}
    </div>
  )
}
