'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import React, { useState } from 'react'
import {
  ExternalLink,
  Clock, XCircle,
  Star,
  ArrowLeft, Phone, Mail,
  X, Trash2, MessageSquare,
  RefreshCw
} from 'lucide-react'
import { getHealthScore, getHealthBadge, getDaysSince, ONBOARDING_STEP_LABELS } from '../_lib/utils'
import ClientBilling from './ClientBilling'

// ─── Props ───
interface ClientProfileProps {
  client: any
  onBack: () => void
  onUpdate: (data: any) => void
  onRefresh: () => Promise<void>
  onDelete: () => Promise<void>
  onDeleteMessages: () => Promise<void>
  profileTab: string
  setProfileTab: (v: string) => void
}

export default function ClientProfile({ client, onBack, onUpdate, onDelete, onDeleteMessages, onRefresh, profileTab, setProfileTab }: ClientProfileProps) {
  const contact = client.contactName || (client.lead ? `${client.lead.firstName} ${client.lead.lastName || ''}`.trim() : '')
  const phone = client.phone || client.lead?.phone || ''
  const email = client.email || client.lead?.email || ''
  const location = client.location || (client.lead ? `${client.lead.city || ''}, ${client.lead.state || ''}`.replace(/^, |, $/g, '') : '')
  const healthScore = getHealthScore(client)
  const health = getHealthBadge(healthScore)
  const daysActive = getDaysSince(client.siteLiveDate)
  const daysSinceInteraction = getDaysSince(client.lastInteraction)
  const rating = client.lead?.enrichedRating
  const reviews = client.lead?.enrichedReviews

  const [noteInput, setNoteInput] = useState(client.notes || '')
  const [tagInput, setTagInput] = useState('')
  const [aiToggle, setAiToggle] = useState(client.aiAutoRespond !== false)
  const [reportFreq, setReportFreq] = useState(client.statReportFrequency || 'monthly')
  const [markingLive, setMarkingLive] = useState(false)
  const [markLiveOpen, setMarkLiveOpen] = useState(false)
  const [commissionInput, setCommissionInput] = useState('')
  const [commissionError, setCommissionError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const repDisplayName = client.repName || client.rep?.name || null

  const handleMarkLive = async () => {
    // Validate commission amount if entered
    if (commissionInput) {
      const parsed = parseFloat(commissionInput)
      if (isNaN(parsed) || parsed <= 0) {
        setCommissionError('Amount must be greater than 0')
        return
      }
    }
    setCommissionError('')
    setMarkingLive(true)
    try {
      const amount = commissionInput ? parseFloat(commissionInput) : null
      const res = await fetch(`/api/clients/${client.id}/mark-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionAmount: amount && amount > 0 ? amount : null }),
      })
      const data = await res.json()
      if (res.ok) {
        setToast({ message: `${client.companyName} is now live!`, type: 'success' })
        setTimeout(() => setToast(null), 4000)
        setMarkLiveOpen(false)
        setCommissionInput('')
        await onRefresh()
      } else {
        setToast({ message: data.error || 'Failed to mark live', type: 'error' })
        setTimeout(() => setToast(null), 4000)
      }
    } catch {
      setToast({ message: 'Network error — please try again', type: 'error' })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setMarkingLive(false)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
        <ArrowLeft size={16} /> Back to Clients
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{client.companyName}</h1>
          <div className="flex items-center gap-3 mt-1 text-gray-500 dark:text-gray-400 text-sm flex-wrap">
            {contact && <span>{contact}</span>}
            {location && <span>- {location}</span>}
            {client.industry && <span>- {client.industry.replace(/_/g, ' ')}</span>}
            {rating && <span className="flex items-center gap-1"><Star size={12} className="text-amber-500" /> {rating} ({reviews} reviews)</span>}
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm">
            {phone && <span className="flex items-center gap-1"><Phone size={12} /> {phone}</span>}
            {email && <span className="flex items-center gap-1"><Mail size={12} /> {email}</span>}
          </div>
          {client.siteUrl && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Site:</span>
              <a href={`https://${client.siteUrl}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
                {client.siteUrl} <ExternalLink size={12} />
              </a>
              {client.stagingUrl && (
                <a href={client.stagingUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:underline text-sm flex items-center gap-1">Staging <ExternalLink size={12} /></a>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {client.clientTrack === 'MEETING_CLOSE' && (
            <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-400">Meeting Close</Badge>
          )}
          <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'destructive'}>{client.hostingStatus}</Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Billing</div>
          <div className="text-xl font-bold">{formatCurrency(client.monthlyRevenue)}/mo</div>
          <div className="text-xs mt-1"><span className={client.hostingStatus === 'ACTIVE' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{client.hostingStatus === 'ACTIVE' ? '🟢 Current' : '🔴 ' + client.hostingStatus}</span></div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Since {client.closedDate ? new Date(client.closedDate).toLocaleDateString() : new Date(client.createdAt).toLocaleDateString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Health</div>
          <div className="text-xl font-bold">Score: {healthScore}</div>
          <div className={`text-xs mt-1 ${health.color} inline-block px-2 py-0.5 rounded-full`}>{health.icon} {health.label}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Engagement</div>
          <div className="text-xl font-bold">{daysSinceInteraction !== null ? `${daysSinceInteraction}d` : 'N/A'}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Edits: {client._count?.editRequests || 0}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">Messages: {client._count?.messages || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Revenue</div>
          <div className="text-xl font-bold">{daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Plan: {client.plan || 'base'}</div>
        </Card>
      </div>

      {/* Profile Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['overview', 'edit-requests', 'messages', 'billing', 'stat-reports', 'timeline'].map(tab => (
          <Button key={tab} variant={profileTab === tab ? 'default' : 'outline'} size="sm" onClick={() => setProfileTab(tab)}>
            {tab.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </Button>
        ))}
      </div>

      {profileTab === 'overview' && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">{client.clientTrack === 'MEETING_CLOSE' ? 'Sourced by:' : 'Closed by:'}</span><span className="ml-2 font-medium">{client.repName || client.rep?.name || '—'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Stripe:</span><span className={`ml-2 font-medium ${client.stripeCustomerId ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>{client.stripeCustomerId ? 'Connected' : 'Not linked'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">Referral:</span><span className="ml-2 font-mono text-xs bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded">{client.referralCode || '—'}</span></div>
            </div>
            {client.analytics && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Site Stats</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { v: client.analytics.totalVisits || 0, l: 'Visitors' },
                    { v: client.analytics.uniqueVisitors || 0, l: 'Unique' },
                    { v: client.analytics.totalCalls || 0, l: 'Calls' },
                    { v: client.analytics.totalForms || 0, l: 'Forms' },
                    { v: client.analytics.bounceRate ? `${Math.round(client.analytics.bounceRate * 100)}%` : '—', l: 'Bounce' },
                  ].map(s => (
                    <div key={s.l} className="bg-gray-50 dark:bg-slate-800/50 rounded p-3 text-center">
                      <div className="text-lg font-bold">{s.v}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Onboarding Progress — only show for clients in onboarding */}
          {client.onboardingStep > 0 && client.onboardingStep < 7 && (
            <OnboardingCard client={client} onRefresh={onRefresh || (() => {})} />
          )}

          {/* Tags */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {(client.tags || []).map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                  {tag}
                  <button onClick={() => onUpdate({ tags: (client.tags || []).filter((t: string) => t !== tag) })} className="hover:text-red-500"><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag..." className="max-w-[200px]" onKeyDown={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) { onUpdate({ tags: [...(client.tags || []), tagInput.trim()] }); setTagInput('') }
              }} />
              <Button variant="outline" size="sm" onClick={() => { if (tagInput.trim()) { onUpdate({ tags: [...(client.tags || []), tagInput.trim()] }); setTagInput('') } }}>Add</Button>
            </div>
          </Card>

          {/* Notes */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Notes</h3>
            <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100 min-h-[80px]" placeholder="Add notes about this client..." />
            <Button variant="outline" size="sm" className="mt-2" onClick={() => onUpdate({ notes: noteInput })}>Save Notes</Button>
          </Card>

          {/* Per-Client Settings */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">AI auto-respond</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Let AI handle this client&apos;s messages</div>
                </div>
                <select value={aiToggle ? 'on' : 'off'} onChange={(e) => { const val = e.target.value === 'on'; setAiToggle(val); onUpdate({ aiAutoRespond: val }) }} className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
                  <option value="on">ON</option>
                  <option value="off">OFF</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Stat report frequency</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">How often to send stats</div>
                </div>
                <select value={reportFreq} onChange={(e) => { setReportFreq(e.target.value); onUpdate({ statReportFrequency: e.target.value }) }} className="px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-md text-sm dark:bg-slate-800 dark:text-gray-100">
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="never">Never</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Automation Mode */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Automation Mode</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Controls how much autonomy the AI has for this client.</p>
            <div className="flex gap-2">
              {[
                { value: 'FULL_AUTO', label: 'Full Auto', desc: 'AI handles everything' },
                { value: 'SEMI_AUTO', label: 'Semi-Auto', desc: 'AI drafts, you approve' },
                { value: 'MANUAL', label: 'Manual', desc: 'You handle everything' },
              ].map(mode => (
                <button
                  key={mode.value}
                  onClick={() => onUpdate({ autonomyLevel: mode.value })}
                  className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                    (client.autonomyLevel || 'FULL_AUTO') === mode.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{mode.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{mode.desc}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* What AI Sees */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">What AI Sees</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Context passed to the AI when handling this client&apos;s conversations.</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-[300px]">
              {JSON.stringify({
                companyName: client.companyName,
                contact,
                phone,
                email,
                location,
                plan: client.plan || 'base',
                hostingStatus: client.hostingStatus,
                autonomyLevel: client.autonomyLevel || 'FULL_AUTO',
                aiAutoRespond: client.aiAutoRespond !== false,
                daysActive,
                healthScore,
                tags: client.tags || [],
              }, null, 2)}
            </pre>
          </Card>

          {/* Meeting Close — Mark Live / Live Status */}
          {client.clientTrack === 'MEETING_CLOSE' && (
            <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
              <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Meeting Close Track</h3>
              {repDisplayName && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Sourced by: <span className="font-medium text-gray-900 dark:text-gray-100">{repDisplayName}</span></p>
              )}
              {client.hostingStatus !== 'ACTIVE' ? (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Site is pending launch. Click below to activate hosting and trigger the 4-touch drip sequence.</p>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setMarkLiveOpen(true)}
                  >
                    Mark Site Live
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Site went live: <span className="font-medium">{client.siteLiveDate ? new Date(client.siteLiveDate).toLocaleDateString() : 'Unknown'}</span>
                </p>
              )}
            </Card>
          )}

          {/* Mark Live Modal */}
          {markLiveOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !markingLive && setMarkLiveOpen(false)}>
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Mark {client.companyName} Live</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This will activate hosting and trigger the 4-touch meeting-close drip sequence.</p>

                {repDisplayName && (
                  <div className="mb-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Sourced by:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{repDisplayName}</span>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Commission Amount ($)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={commissionInput}
                    onChange={(e) => { setCommissionInput(e.target.value); setCommissionError('') }}
                    placeholder="Leave blank for no commission"
                  />
                  {commissionError && <p className="text-xs text-red-500 mt-1">{commissionError}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Optional — leave blank if no commission applies</p>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => { setMarkLiveOpen(false); setCommissionInput(''); setCommissionError('') }} disabled={markingLive}>Cancel</Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkLive} disabled={markingLive}>
                    {markingLive ? 'Marking Live...' : 'Confirm — Mark Live'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <Card className="p-6 border-red-200 dark:border-red-800">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
            <div className="space-y-4">
              {/* Deactivate / Reactivate (hidden for meeting-close clients — Mark Live handles activation) */}
              <div>
                {client.hostingStatus === 'DEACTIVATED' && client.clientTrack !== 'MEETING_CLOSE' ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Reactivate this client. They will be set back to ACTIVE.</p>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        if (confirm(`Reactivate ${client.companyName}?`)) {
                          onUpdate({ hostingStatus: 'ACTIVE' })
                        }
                      }}
                    >
                      <RefreshCw size={14} className="mr-2" />
                      Reactivate Client
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Deactivate this client. They stay in the system but are paused and hidden from AI.</p>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => {
                        if (confirm(`Deactivate ${client.companyName}? They can be reactivated later.`)) {
                          onUpdate({ hostingStatus: 'DEACTIVATED' })
                        }
                      }}
                    >
                      <Clock size={14} className="mr-2" />
                      Deactivate Client
                    </Button>
                  </>
                )}
              </div>
              {/* Cancel */}
              <div className="pt-4 border-t border-red-100 dark:border-red-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Cancel this client. Their site will be taken offline.</p>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to cancel ${client.companyName}? Their hosting will be set to CANCELLED.`)) {
                      onUpdate({ hostingStatus: 'CANCELLED' })
                    }
                  }}
                >
                  <XCircle size={14} className="mr-2" />
                  Cancel Client
                </Button>
              </div>
              {/* Delete Messages */}
              <div className="pt-4 border-t border-red-100 dark:border-red-900">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Delete all message history for this client. The client record stays intact.</p>
                <Button
                  variant="destructive"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => {
                    if (confirm(`Delete ALL messages for ${client.companyName}?\n\nThis will permanently remove every message in their thread. The client record itself will not be affected.\n\nThis cannot be undone.`)) {
                      onDeleteMessages()
                    }
                  }}
                >
                  <MessageSquare size={14} className="mr-2" />
                  Delete All Messages
                </Button>
              </div>
              {/* Hard Delete */}
              <div className="pt-4 border-t border-red-100 dark:border-red-900">
                <p className="text-sm text-red-500 dark:text-red-400 mb-2">Permanently delete this client and all their data (messages, revenue, commissions). This cannot be undone.</p>
                <Button
                  variant="destructive"
                  className="bg-red-700 hover:bg-red-800"
                  onClick={() => {
                    if (confirm(`PERMANENTLY DELETE ${client.companyName}?\n\nThis will remove the client and ALL associated data (messages, payments, commissions) from the database forever.\n\nThis cannot be undone.`)) {
                      onDelete()
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-2" />
                  Permanently Delete
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {profileTab === 'billing' && (
        <ClientBilling client={client} daysActive={daysActive} />
      )}

      {profileTab === 'timeline' && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Timeline</h3>
          <div className="space-y-3 text-sm">
            {[
              { date: client.createdAt, label: 'Client created', color: 'bg-green-500' },
              client.closedDate && { date: client.closedDate, label: 'Deal closed', color: 'bg-blue-500' },
              client.siteLiveDate && { date: client.siteLiveDate, label: 'Site went live', color: 'bg-purple-500' },
              client.churnedDate && { date: client.churnedDate, label: 'Churned', color: 'bg-red-500' },
            ].filter(Boolean).map((event: any, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className={`w-2 h-2 ${event.color} rounded-full`} />
                <span className="text-gray-500 dark:text-gray-400 w-24">{new Date(event.date).toLocaleDateString()}</span>
                <span>{event.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {['messages', 'edit-requests', 'stat-reports'].includes(profileTab) && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{profileTab.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">View full {profileTab.replace(/-/g, ' ')} in the dedicated tab above.</p>
        </Card>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════
// ONBOARDING CARD
// ═══════════════════════════════════════════════
function OnboardingCard({ client, onRefresh }: { client: any; onRefresh: () => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const step = client.onboardingStep || 0
  const data = (client.onboardingData || {}) as Record<string, any>
  const domain = data.domainPreference || client.customDomain || ''

  const steps = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'Domain' },
    { num: 3, label: 'Content' },
    { num: 4, label: 'Setup' },
    { num: 5, label: 'DNS' },
    { num: 6, label: 'Go-Live' },
    { num: 7, label: 'Done' },
  ]

  const handleAction = async (action: string, extraData?: Record<string, any>) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/clients/${client.id}/domain-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })
      if (res.ok) {
        onRefresh()
      } else {
        const err = await res.json()
        alert(`Action failed: ${err.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Domain action failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleAdvance = async () => {
    setActionLoading('advance')
    try {
      const res = await fetch(`/api/clients/${client.id}/onboarding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      if (res.ok) onRefresh()
    } catch (err) {
      console.error('Advance failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Clock size={16} className="text-blue-500" />
        Onboarding Progress
      </h3>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-4">
        {steps.map((s) => (
          <div key={s.num} className="flex-1 flex flex-col items-center">
            <div className={`w-full h-2 rounded-full ${
              s.num < step ? 'bg-green-500' :
              s.num === step ? 'bg-blue-500' :
              'bg-gray-200 dark:bg-slate-700'
            }`} />
            <span className={`text-[10px] mt-1 ${
              s.num === step ? 'text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'
            }`}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Current step info */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Step {step}/7 — <span className="font-medium">{ONBOARDING_STEP_LABELS[step] || 'Unknown'}</span>
      </div>

      {/* Domain info */}
      {domain && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Domain:</span>
          <span className="font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border dark:border-slate-700 text-gray-800 dark:text-gray-200">{domain}</span>
          {client.domainStatus && (
            <Badge variant="outline" className="text-xs">
              {client.domainStatus}
            </Badge>
          )}
          {data.domainOwnership && (
            <span className="text-xs text-gray-400 dark:text-gray-500">({data.domainOwnership === 'owns_domain' ? 'Client owns' : 'We register'})</span>
          )}
        </div>
      )}

      {/* Action buttons based on step */}
      <div className="flex flex-wrap gap-2 mt-3">
        {step === 4 && domain && (
          <Button size="sm" variant="default"
            onClick={() => handleAction('add_to_vercel', { domain })}
            disabled={actionLoading === 'add_to_vercel'}
          >
            {actionLoading === 'add_to_vercel' ? 'Adding...' : 'Add to Vercel'}
          </Button>
        )}

        {step === 4 && data.domainOwnership === 'needs_new' && (
          <Button size="sm" variant="outline"
            onClick={() => handleAction('mark_registered', { domain })}
            disabled={actionLoading === 'mark_registered'}
          >
            {actionLoading === 'mark_registered' ? 'Marking...' : 'Mark Registered'}
          </Button>
        )}

        {step === 5 && (
          <>
            <Button size="sm" variant="default"
              onClick={() => handleAction('check_dns')}
              disabled={actionLoading === 'check_dns'}
            >
              <RefreshCw size={14} className={`mr-1 ${actionLoading === 'check_dns' ? 'animate-spin' : ''}`} />
              {actionLoading === 'check_dns' ? 'Checking...' : 'Check DNS'}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => handleAction('resend_dns_instructions')}
              disabled={actionLoading === 'resend_dns_instructions'}
            >
              {actionLoading === 'resend_dns_instructions' ? 'Sending...' : 'Resend DNS Instructions'}
            </Button>
          </>
        )}

        {step === 6 && (
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700"
            onClick={() => handleAction('force_go_live')}
            disabled={actionLoading === 'force_go_live'}
          >
            {actionLoading === 'force_go_live' ? 'Going Live...' : 'Go Live Now'}
          </Button>
        )}

        {step > 0 && step < 7 && (
          <Button size="sm" variant="ghost"
            onClick={handleAdvance}
            disabled={actionLoading === 'advance'}
          >
            {actionLoading === 'advance' ? 'Advancing...' : 'Skip to Next Step'}
          </Button>
        )}
      </div>
    </Card>
  )
}
