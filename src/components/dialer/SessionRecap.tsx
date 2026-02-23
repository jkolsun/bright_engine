'use client'
import { useDialer } from './DialerProvider'
import { CheckCircle, Clock, Phone, PhoneCall, Timer } from 'lucide-react'

const DISPOSITION_COLORS: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'bg-green-500',
  INTERESTED_VERBAL: 'bg-green-400',
  CALLBACK: 'bg-teal-500',
  WANTS_CHANGES: 'bg-teal-400',
  WILL_LOOK_LATER: 'bg-blue-400',
  NOT_INTERESTED: 'bg-gray-400',
  VOICEMAIL: 'bg-amber-400',
  NO_ANSWER: 'bg-gray-300',
  DNC: 'bg-red-500',
  WRONG_NUMBER: 'bg-red-400',
  DISCONNECTED: 'bg-red-300',
}

const DISPOSITION_LABELS: Record<string, string> = {
  WANTS_TO_MOVE_FORWARD: 'Wants to Move Forward',
  INTERESTED_VERBAL: 'Interested (Verbal)',
  CALLBACK: 'Callback',
  WANTS_CHANGES: 'Wants Changes',
  WILL_LOOK_LATER: 'Will Look Later',
  NOT_INTERESTED: 'Not Interested',
  VOICEMAIL: 'Voicemail',
  NO_ANSWER: 'No Answer',
  DNC: 'Do Not Call',
  WRONG_NUMBER: 'Wrong Number',
  DISCONNECTED: 'Disconnected',
}

function formatDuration(startedAt?: string, endedAt?: string): string {
  if (!startedAt || !endedAt) return '0m'
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function formatAvgDuration(seconds: number): string {
  if (!seconds) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}

export function SessionRecap() {
  const { session } = useDialer()
  const recap = session.sessionRecap
  if (!recap) return null

  const connectRate = recap.totalCalls > 0
    ? Math.round((recap.connectedCalls / recap.totalCalls) * 100)
    : 0

  // Build disposition breakdown from the session stats we have
  const dispositions: { key: string; count: number }[] = [
    { key: 'INTERESTED_VERBAL', count: recap.interestedCount },
    { key: 'CALLBACK', count: recap.callbacksScheduled },
    { key: 'NOT_INTERESTED', count: recap.notInterestedCount },
    { key: 'VOICEMAIL', count: recap.voicemails },
    { key: 'NO_ANSWER', count: recap.noAnswers },
  ].filter(d => d.count > 0)

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Session Complete</h2>
          <p className="text-sm text-gray-500 mt-1">
            {formatDuration(recap.startedAt, recap.endedAt)} session
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Total Dials</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{recap.totalCalls}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Connected</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {recap.connectedCalls}
              <span className="text-sm font-normal text-gray-400 ml-1">({connectRate}%)</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
              <Timer className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Avg Duration</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatAvgDuration(recap.avgCallDuration)}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium uppercase tracking-wide">Duration</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatDuration(recap.startedAt, recap.endedAt)}</div>
          </div>
        </div>

        {/* Previews sent */}
        {recap.previewsSent > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">Previews Sent</span>
            <span className="text-sm font-semibold text-gray-900">{recap.previewsSent}</span>
          </div>
        )}

        {/* Disposition Breakdown */}
        {dispositions.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Disposition Breakdown</h3>
            <div className="space-y-2">
              {dispositions.map(d => (
                <div key={d.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${DISPOSITION_COLORS[d.key] || 'bg-gray-300'}`} />
                    <span className="text-sm text-gray-700">{DISPOSITION_LABELS[d.key] || d.key}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={() => session.clearRecap()}
          className="w-full py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 shadow-teal"
        >
          Done
        </button>
      </div>
    </div>
  )
}
