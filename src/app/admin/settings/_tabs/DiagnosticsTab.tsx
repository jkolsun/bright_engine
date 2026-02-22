'use client'

import { useState, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════
//  DIAGNOSTICS TAB — system-test runner (self-contained)
// ═══════════════════════════════════════════════════════════

export default function DiagnosticsTab() {
  const [results, setResults] = useState<any>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const runTest = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/system-test', { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResults(data)
      setLastRun(new Date().toLocaleString())
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  // Auto-run on mount so diagnostics always reflect current deployment state
  useEffect(() => {
    runTest()
  }, [])

  // Optional auto-refresh every 60 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(runTest, 60_000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const downloadJson = () => {
    if (!results) return
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diagnostics-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const statusIcon = (s: string) =>
    s === 'pass' ? '\u2705' : s === 'fail' ? '\u274C' : s === 'warn' ? '\u26A0\uFE0F' : '\u23ED\uFE0F'

  const statusColor = (s: string) =>
    s === 'pass'
      ? 'bg-green-50 border-green-200'
      : s === 'fail'
      ? 'bg-red-50 border-red-200'
      : s === 'warn'
      ? 'bg-amber-50 border-amber-200'
      : 'bg-gray-50 border-gray-200'

  const grouped =
    results?.results?.reduce((acc: any, r: any) => {
      if (!acc[r.category]) acc[r.category] = []
      acc[r.category].push(r)
      return acc
    }, {}) || {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">System Diagnostics</h2>
          <p className="text-sm text-gray-500">
            Tests every connection, service, and feature end-to-end
            {lastRun && <span className="ml-2 text-gray-400">| Last run: {lastRun}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>
          {results && (
            <button
              onClick={downloadJson}
              className="px-4 py-2.5 rounded-xl font-semibold text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download JSON
            </button>
          )}
          <button
            onClick={runTest}
            disabled={running}
            className={`px-6 py-2.5 rounded-xl font-bold text-white transition-all ${
              running
                ? 'bg-gray-400 cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Testing...
              </span>
            ) : (
              'Re-run Tests'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          Test failed to run: {error}
        </div>
      )}

      {!results && !error && running && (
        <div className="p-6 rounded-xl border-2 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-800 font-medium">Running system diagnostics...</span>
          </div>
        </div>
      )}

      {results && (
        <div
          className={`p-6 rounded-xl border-2 ${
            results.verdict === 'ALL_CLEAR'
              ? 'bg-green-50 border-green-300'
              : results.verdict === 'ISSUES_FOUND'
              ? 'bg-amber-50 border-amber-300'
              : 'bg-red-50 border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {results.verdict === 'ALL_CLEAR'
                  ? 'All Systems Go'
                  : results.verdict === 'ISSUES_FOUND'
                  ? 'Issues Found'
                  : 'Critical Failures'}
              </div>
              <div className="text-sm mt-1 opacity-70">
                {results.summary.passed} passed | {results.summary.failed} failed | {results.summary.warned} warnings |{' '}
                {results.summary.skipped} skipped
              </div>
            </div>
            <div className="text-right text-sm opacity-60">
              <div>Completed in {results.duration}ms</div>
              <div>{new Date(results.timestamp).toLocaleTimeString()}</div>
              {autoRefresh && <div className="text-blue-600 font-medium mt-1">Auto-refreshing every 60s</div>}
            </div>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([category, tests]: [string, any]) => (
        <div key={category}>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">{category}</h3>
          <div className="space-y-1.5">
            {tests.map((test: any, i: number) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg border ${statusColor(test.status)}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{statusIcon(test.status)}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{test.name}</div>
                    <div className="text-xs text-gray-500">{test.detail}</div>
                  </div>
                </div>
                {test.ms > 0 && <span className="text-xs text-gray-400">{test.ms}ms</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
