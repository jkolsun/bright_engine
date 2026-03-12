'use client'

import { useState } from 'react'
import { Loader2, Pencil } from 'lucide-react'

interface EditPanelProps {
  leadId: string
  onDone: () => void
}

export default function EditPanel({ leadId, onDone }: EditPanelProps) {
  const [instructions, setInstructions] = useState('')
  const [applying, setApplying] = useState(false)
  const [result, setResult] = useState<{ summary: string[]; error?: string } | null>(null)

  const applyEdit = async () => {
    if (!instructions.trim()) return
    setApplying(true)
    setResult(null)
    try {
      const res = await fetch(`/api/build-queue/${leadId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instructions }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ summary: data.summary })
        setInstructions('')
        onDone()
      } else {
        setResult({ summary: [], error: data.error || 'Failed to apply edit' })
      }
    } catch {
      setResult({ summary: [], error: 'Network error' })
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
      <textarea
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder='Type edit instructions in plain English... e.g. "Change the headline to Dallas Roofing You Can Trust"'
        className="w-full p-3 border border-gray-300 dark:border-slate-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:text-gray-100"
        rows={3}
        disabled={applying}
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={applyEdit}
          disabled={applying || !instructions.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {applying ? <Loader2 size={14} className="animate-spin" /> : <Pencil size={14} />}
          {applying ? 'Applying...' : 'Apply Edits'}
        </button>
      </div>
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'}`}>
          {result.error ? (
            <p>{result.error}</p>
          ) : (
            <ul className="space-y-1">
              {result.summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
