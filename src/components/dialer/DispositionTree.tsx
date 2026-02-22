'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDialer } from './DialerProvider'
import type { Recommendation } from '@/types/dialer'

// Binary disposition tree — 2 choices at each step
const TREE = {
  root: { q: 'Did you speak with the decision maker?', a: 'connected', b: 'not_reached' },
  connected: { q: 'Are they interested?', a: 'interested', b: 'not_interested_check' },
  interested: { q: 'Ready to move forward now?', a: 'WANTS_TO_MOVE_FORWARD', b: 'interested_but' },
  interested_but: { q: 'Want changes or time?', a: 'WANTS_CHANGES', b: 'soft_interest' },
  soft_interest: { q: 'Schedule a callback?', a: 'CALLBACK', b: 'INTERESTED_VERBAL' },
  not_interested_check: { q: 'Will they look at the preview later?', a: 'WILL_LOOK_LATER', b: 'hard_no' },
  hard_no: { q: 'Do Not Contact?', a: 'DNC', b: 'NOT_INTERESTED' },
  not_reached: { q: 'Did you reach voicemail?', a: 'VOICEMAIL', b: 'no_answer_check' },
  no_answer_check: { q: 'Wrong number or no answer?', a: 'WRONG_NUMBER', b: 'NO_ANSWER' },
} as Record<string, { q: string; a: string; b: string }>

export function DispositionTree() {
  const { currentCall, queue, setCurrentCall } = useDialer()
  const [step, setStep] = useState('root')
  const [path, setPath] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Fetch recommendations
  useEffect(() => {
    if (!currentCall || !queue.selectedLeadId) return
    fetch(`/api/dialer/recommendation?callId=${currentCall.id}&leadId=${queue.selectedLeadId}`)
      .then(r => r.json())
      .then(data => setRecommendations(data.recommendations || []))
      .catch(() => {})
  }, [currentCall?.id, queue.selectedLeadId])

  const node = TREE[step]
  const isTerminal = !node

  const choose = useCallback((choice: 'a' | 'b') => {
    if (!node) return
    const next = choice === 'a' ? node.a : node.b
    setPath(p => [...p, choice])
    setStep(next)
  }, [node])

  const submitDisposition = useCallback(async (result: string) => {
    if (!currentCall) return
    setSubmitting(true)
    try {
      const isRecommended = recommendations.some(r => r.outcome === result)
      await fetch('/api/dialer/disposition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: currentCall.id, result, path, wasRecommended: isRecommended }),
      })
      setCurrentCall(null)
      setStep('root')
      setPath([])
      queue.selectNext()
    } finally { setSubmitting(false) }
  }, [currentCall, path, recommendations])

  // Check if current step is a terminal (disposition result)
  useEffect(() => {
    if (isTerminal && step !== 'root') {
      // Auto-submit the final disposition
      submitDisposition(step)
    }
  }, [step, isTerminal])

  if (!node || submitting) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
        <div className="text-sm text-gray-500">{submitting ? 'Logging disposition...' : 'Processing...'}</div>
      </div>
    )
  }

  // Find recommendation for current options
  const recA = recommendations.find(r => r.outcome === node.a)
  const recB = recommendations.find(r => r.outcome === node.b)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Disposition</h3>

      {/* AI Recommendations */}
      {recommendations.length > 0 && step === 'root' && (
        <div className="mb-3 p-2 bg-purple-50 rounded-lg">
          <div className="text-[10px] text-purple-600 font-medium mb-1">AI Recommendation</div>
          {recommendations.slice(0, 2).map(r => (
            <div key={r.outcome} className="text-xs text-purple-700">
              {r.outcome.replace(/_/g, ' ')} ({Math.round(r.confidence * 100)}%) — {r.reason}
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-700 mb-3">{node.q}</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => choose('a')}
          className={`px-4 py-3 text-sm font-medium rounded-lg border transition-colors ${recA ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          {TREE[node.a]?.q ? 'Yes' : node.a.replace(/_/g, ' ')}
          {recA && <span className="block text-[10px] text-purple-500 mt-0.5">{Math.round(recA.confidence * 100)}% match</span>}
        </button>
        <button
          onClick={() => choose('b')}
          className={`px-4 py-3 text-sm font-medium rounded-lg border transition-colors ${recB ? 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
        >
          {TREE[node.b]?.q ? 'No' : node.b.replace(/_/g, ' ')}
          {recB && <span className="block text-[10px] text-purple-500 mt-0.5">{Math.round(recB.confidence * 100)}% match</span>}
        </button>
      </div>
      {path.length > 0 && (
        <button onClick={() => { setStep('root'); setPath([]) }} className="mt-2 text-xs text-gray-400 hover:text-gray-600">
          Start over
        </button>
      )}
    </div>
  )
}
