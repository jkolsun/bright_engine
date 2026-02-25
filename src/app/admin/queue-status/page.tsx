'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertTriangle, CheckCircle, Clock, XCircle, Activity, RotateCcw, Trash2 } from 'lucide-react'

interface QueueCounts {
  active?: number
  waiting?: number
  completed?: number
  failed?: number
  delayed?: number
  paused?: number
  [key: string]: number | undefined
}

interface FailedJob {
  queue: string
  id?: string
  name?: string
  failedReason?: string
  attemptsMade?: number
  timestamp?: number
  data?: Record<string, unknown>
}

interface QueueStatus {
  timestamp: string
  redisConnected: boolean
  queues: Record<string, QueueCounts | { error: string }>
  failedJobs: FailedJob[]
}

export default function QueueStatusPage() {
  const [data, setData] = useState<QueueStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/queue-status')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 30_000)
    return () => clearInterval(interval)
  }, [])

  const retryJob = async (queueName: string, jobId: string) => {
    setActionLoading(`retry-${jobId}`)
    try {
      const res = await fetch('/api/admin/queue-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry', queueName, jobId }),
      })
      if (res.ok) await fetchStatus()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const clearQueue = async (queueName: string) => {
    setActionLoading(`clear-${queueName}`)
    try {
      const res = await fetch('/api/admin/queue-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', queueName }),
      })
      if (res.ok) await fetchStatus()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const totalFailed = data
    ? Object.values(data.queues).reduce((sum, q) => {
        if ('error' in q) return sum
        return sum + (q.failed || 0)
      }, 0)
    : 0

  const totalActive = data
    ? Object.values(data.queues).reduce((sum, q) => {
        if ('error' in q) return sum
        return sum + (q.active || 0)
      }, 0)
    : 0

  const totalWaiting = data
    ? Object.values(data.queues).reduce((sum, q) => {
        if ('error' in q) return sum
        return sum + (q.waiting || 0)
      }, 0)
    : 0

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Queue Status</h1>
          <p className="text-gray-500 mt-1">
            BullMQ worker queues — active jobs, failures, and health
          </p>
        </div>
        <Button onClick={fetchStatus} disabled={loading} variant="outline" className="gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} />
            <span className="font-medium">{error}</span>
          </div>
        </Card>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={32} className="text-gray-400 animate-spin" />
        </div>
      )}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Redis</p>
                  <p className="text-lg font-bold text-green-600">Connected</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Jobs</p>
                  <p className="text-lg font-bold">{totalActive}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock size={20} className="text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Waiting</p>
                  <p className="text-lg font-bold">{totalWaiting}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${totalFailed > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                  <XCircle size={20} className={totalFailed > 0 ? 'text-red-600' : 'text-gray-400'} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className={`text-lg font-bold ${totalFailed > 0 ? 'text-red-600' : ''}`}>{totalFailed}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Per-queue breakdown */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">Queue Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-600">Queue</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Active</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Waiting</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Delayed</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Completed</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(data.queues).map(([name, counts]) => {
                    if ('error' in counts) {
                      return (
                        <tr key={name} className="border-b">
                          <td className="px-6 py-3 font-medium capitalize">{name}</td>
                          <td colSpan={5} className="px-4 py-3 text-red-600">
                            Error: {(counts as { error: string }).error}
                          </td>
                        </tr>
                      )
                    }
                    const c = counts as QueueCounts
                    return (
                      <tr key={name} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium capitalize">{name}</td>
                        <td className="text-right px-4 py-3">
                          {c.active ? (
                            <Badge variant="default" className="bg-blue-600">{c.active}</Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="text-right px-4 py-3">
                          {c.waiting ? (
                            <Badge variant="outline" className="text-yellow-700 border-yellow-300">{c.waiting}</Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-gray-500">{c.delayed || 0}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className="text-green-600">{c.completed || 0}</span>
                        </td>
                        <td className="text-right px-4 py-3">
                          {c.failed ? (
                            <Badge variant="destructive">{c.failed}</Badge>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Failed jobs detail */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Failed Jobs {data.failedJobs.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{data.failedJobs.length}</Badge>
                )}
              </h2>
              {data.failedJobs.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Group clear buttons by queue */}
                  {[...new Set(data.failedJobs.map(j => j.queue))].map(queueName => (
                    <Button
                      key={queueName}
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={actionLoading === `clear-${queueName}`}
                      onClick={() => clearQueue(queueName)}
                    >
                      <Trash2 size={12} />
                      Clear {queueName}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {data.failedJobs.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                <CheckCircle size={32} className="mx-auto mb-3 text-green-400" />
                <p>No failed jobs — all queues healthy</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {data.failedJobs.map((job, i) => (
                  <div key={`${job.queue}-${job.id}-${i}`} className="px-6 py-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="capitalize">{job.queue}</Badge>
                      <span className="text-sm font-medium">{job.name || 'unknown'}</span>
                      <span className="text-xs text-gray-400">ID: {job.id}</span>
                      {job.attemptsMade && (
                        <span className="text-xs text-gray-400">
                          Attempts: {job.attemptsMade}
                        </span>
                      )}
                      {job.timestamp && (
                        <span className="text-xs text-gray-400">
                          {new Date(job.timestamp).toLocaleString()}
                        </span>
                      )}
                      {job.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-xs gap-1 text-blue-600 hover:bg-blue-50 h-7"
                          disabled={actionLoading === `retry-${job.id}`}
                          onClick={() => retryJob(job.queue, job.id!)}
                        >
                          <RotateCcw size={12} className={actionLoading === `retry-${job.id}` ? 'animate-spin' : ''} />
                          Retry
                        </Button>
                      )}
                    </div>
                    <pre className="text-xs text-red-600 bg-red-50 rounded p-3 overflow-x-auto whitespace-pre-wrap">
                      {job.failedReason || 'No error message'}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <p className="text-xs text-gray-400 text-right">
            Last updated: {new Date(data.timestamp).toLocaleString()} — auto-refreshes every 30s
          </p>
        </>
      )}
    </div>
  )
}
