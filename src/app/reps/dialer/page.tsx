'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Phone,
  SkipForward,
  CheckCircle,
  MessageSquare,
  Copy,
  Edit3,
  Save,
  X,
  PhoneForwarded,
  PhoneOff,
  PhoneMissed,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Globe,
  Star,
  MapPin,
  Building
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

const DEFAULT_SCRIPT = `OPENER (10 sec):
"Hey {{firstName}}, this is [YOUR NAME] with Bright Automations. Not trying to sell you anything crazy — quick question, do you have 30 seconds?"

If no: "When's a better time?"

HOOK — Bad Website (20 sec):
"I pulled up {{companyName}}'s website before I called. Not gonna sugarcoat it — not showing up well on mobile and the design looks dated. Are you getting leads from it?"

HOOK — No Website (20 sec):
"I searched for {{industry}} in {{location}} and couldn't find a site for {{companyName}}. Are you getting most business from referrals?"

PITCH (30 sec):
"Here's why I'm calling. We build professional sites specifically for {{industry}} businesses. Clean, works on phones, shows up on Google. $149, live in 48 hours. And actually — I already mocked up what a site for {{companyName}} would look like. Want me to text you the link so you can see it?"

CLOSE — If Interested:
"Awesome. I'm texting you the preview right now. Take a look, and if you like it, just text us back and we'll make it live. You don't pay until you're happy with it. What's the best number to text?"`

export default function DialerPage() {
  const [queue, setQueue] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [initialQueueSize, setInitialQueueSize] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [callActive, setCallActive] = useState(false)
  const [connected, setConnected] = useState(false)
  const [callNotes, setCallNotes] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [copiedPreview, setCopiedPreview] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [sessionStats, setSessionStats] = useState({ dials: 0, conversations: 0, previewLinksSent: 0, closes: 0 })

  // Edit lead state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const currentLead = queue[currentIndex] || null

  useEffect(() => { loadQueue() }, [])

  const loadQueue = async () => {
    try {
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      setUserId(meData.user.id)

      const leadsRes = await fetch(`/api/leads?assignedTo=${meData.user.id}&status=NEW,HOT_LEAD,QUALIFIED&limit=100`)
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        const leads = data.leads || []
        setQueue(leads)
        setInitialQueueSize(leads.length)
      }

      // Load today's stats
      const statsRes = await fetch('/api/activity')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setSessionStats(statsData.stats)
      }
    } catch (e) { console.error('Failed to load queue:', e) }
    finally { setLoading(false) }
  }

  const logActivity = useCallback(async (leadId: string, disposition: string, notes?: string) => {
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          activityType: 'CALL',
          callDisposition: disposition,
          notes: notes || undefined,
        })
      })
    } catch (e) { console.error('Failed to log activity:', e) }
  }, [])

  const logPreviewSent = useCallback(async (leadId: string) => {
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          activityType: 'PREVIEW_SENT',
          notes: 'Preview link sent via dialer',
        })
      })
    } catch (e) { console.error('Failed to log preview sent:', e) }
  }, [])

  const handleCall = () => {
    if (currentLead?.phone) {
      window.open(`tel:${currentLead.phone}`)
      setCallActive(true)
      setConnected(false)
      setCallNotes('')
    }
  }

  const handleOutcome = async (disposition: string) => {
    if (!currentLead || processing) return
    setProcessing(true)

    // Capture notes before clearing state
    const notes = callNotes || undefined

    // Log the Activity record
    await logActivity(currentLead.id, disposition, notes)

    // Update lead status based on outcome
    let newStatus = currentLead.status
    if (disposition === 'INTERESTED') newStatus = 'QUALIFIED'
    else if (disposition === 'NOT_INTERESTED') newStatus = 'CLOSED_LOST'
    else if (disposition === 'CALLBACK') newStatus = 'QUALIFIED'
    else if (disposition === 'WRONG_NUMBER') newStatus = 'CLOSED_LOST'

    if (newStatus !== currentLead.status) {
      try {
        await fetch(`/api/leads/${currentLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      } catch (e) { console.error(e) }
    }

    // Update session stats locally
    const isConversation = ['CONNECTED', 'INTERESTED', 'NOT_INTERESTED', 'CALLBACK'].includes(disposition)
    setSessionStats(prev => ({
      ...prev,
      dials: prev.dials + 1,
      conversations: isConversation ? prev.conversations + 1 : prev.conversations,
      closes: disposition === 'INTERESTED' ? prev.closes + 1 : prev.closes,
    }))

    // Reset call state
    setCallActive(false)
    setConnected(false)
    setCallNotes('')

    // Terminal outcomes: remove lead from queue (they won't be called again)
    const terminalOutcomes = ['INTERESTED', 'NOT_INTERESTED', 'WRONG_NUMBER']
    if (terminalOutcomes.includes(disposition)) {
      setCompletedCount(prev => prev + 1)
      const newQueue = queue.filter((_, i) => i !== currentIndex)
      setQueue(newQueue)
      // If we removed the last item, step back
      if (currentIndex >= newQueue.length && newQueue.length > 0) {
        setCurrentIndex(newQueue.length - 1)
      }
    } else {
      // Non-terminal (NO_ANSWER, VOICEMAIL, CALLBACK): advance to next, keep lead in queue for retry
      setCompletedCount(prev => prev + 1)
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Wrap around to start of queue for retry
        setCurrentIndex(0)
      }
    }

    setProcessing(false)
  }

  const skipLead = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSendPreview = async (method: 'sms' | 'copy') => {
    if (!currentLead?.previewUrl) return

    if (method === 'sms') {
      const message = encodeURIComponent(
        `Hey ${currentLead.firstName}, here's the preview of your new website for ${currentLead.companyName}: ${currentLead.previewUrl}`
      )
      window.open(`sms:${currentLead.phone}?body=${message}`)
    } else {
      await navigator.clipboard.writeText(currentLead.previewUrl)
      setCopiedPreview(true)
      setTimeout(() => setCopiedPreview(false), 2000)
    }

    // Log preview sent
    await logPreviewSent(currentLead.id)
    setSessionStats(prev => ({ ...prev, previewLinksSent: prev.previewLinksSent + 1 }))
  }

  // Edit lead handlers
  const openEditDialog = () => {
    if (!currentLead) return
    setEditForm({
      firstName: currentLead.firstName || '',
      lastName: currentLead.lastName || '',
      companyName: currentLead.companyName || '',
      phone: currentLead.phone || '',
      email: currentLead.email || '',
      city: currentLead.city || '',
      state: currentLead.state || '',
      industry: currentLead.industry || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!currentLead) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        // Update local state
        const updatedQueue = [...queue]
        updatedQueue[currentIndex] = { ...currentLead, ...editForm }
        setQueue(updatedQueue)
        setEditDialogOpen(false)
      }
    } catch (e) { console.error('Failed to save:', e) }
    finally { setSaving(false) }
  }

  // Personalize the call script
  const getScript = () => {
    if (currentLead?.callScript) return currentLead.callScript

    return DEFAULT_SCRIPT
      .replace(/\{\{firstName\}\}/g, currentLead?.firstName || '[Name]')
      .replace(/\{\{companyName\}\}/g, currentLead?.companyName || '[Company]')
      .replace(/\{\{industry\}\}/g, currentLead?.industry?.toLowerCase().replace(/_/g, ' ') || '[industry]')
      .replace(/\{\{location\}\}/g,
        [currentLead?.city, currentLead?.state].filter(Boolean).join(', ') || '[location]'
      )
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dialer queue...</div>

  return (
    <div className="p-8 space-y-6">
      {/* Header + Session Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Power Dialer</h1>
          <p className="text-gray-500 mt-1">
            {queue.length > 0
              ? `Lead ${currentIndex + 1} of ${queue.length} remaining (${completedCount} completed)`
              : 'No leads in queue'}
          </p>
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Phone size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{sessionStats.dials}</div>
            <div className="text-xs text-gray-500">Dials Today</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <PhoneForwarded size={18} className="text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{sessionStats.conversations}</div>
            <div className="text-xs text-gray-500">Connects</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <MessageSquare size={18} className="text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{sessionStats.previewLinksSent}</div>
            <div className="text-xs text-gray-500">Previews Sent</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Target size={18} className="text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{sessionStats.closes}</div>
            <div className="text-xs text-gray-500">Interested</div>
          </div>
        </Card>
      </div>

      {/* Queue Progress Bar */}
      {initialQueueSize > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / initialQueueSize) * 100}%` }}
          />
        </div>
      )}

      {!currentLead ? (
        <Card className="p-12 text-center">
          <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900">Queue Complete!</h3>
          <p className="text-gray-600 mt-2">No more leads to call right now.</p>
          <div className="mt-6 p-4 bg-gray-50 rounded-lg inline-block">
            <p className="text-sm text-gray-500">Today&apos;s Session</p>
            <p className="text-lg font-semibold">
              {sessionStats.dials} dials / {sessionStats.conversations} connects / {sessionStats.closes} interested
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Lead Card + Actions */}
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{currentLead.companyName}</h2>
                  <p className="text-lg text-gray-600">{currentLead.firstName} {currentLead.lastName}</p>
                  <p className="text-gray-500">{currentLead.city}{currentLead.city && currentLead.state ? ', ' : ''}{currentLead.state}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={currentLead.status === 'HOT_LEAD' ? 'destructive' : 'default'}>
                      {currentLead.status}
                    </Badge>
                    {currentLead.industry && (
                      <Badge variant="outline" className="text-xs">
                        {currentLead.industry.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={openEditDialog} title="Edit lead info">
                  <Edit3 size={16} className="mr-1" /> Edit
                </Button>
              </div>

              {/* Company Summary */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1.5">
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  <span className="flex items-center gap-1">
                    <Building size={13} className="text-gray-400" />
                    {currentLead.industry?.replace(/_/g, ' ') || 'Unknown industry'}
                  </span>
                  {(currentLead.city || currentLead.state) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-gray-400" />
                      {[currentLead.city, currentLead.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {currentLead.enrichedRating && (
                    <span className="flex items-center gap-1">
                      <Star size={13} className="text-amber-400 fill-amber-400" />
                      {currentLead.enrichedRating}{currentLead.enrichedReviews ? ` (${currentLead.enrichedReviews} reviews)` : ''}
                    </span>
                  )}
                </div>
                {currentLead.website && (
                  <div className="flex items-center gap-1 text-sm">
                    <Globe size={13} className="text-gray-400" />
                    <a href={currentLead.website.startsWith('http') ? currentLead.website : `https://${currentLead.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {currentLead.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
                {currentLead.enrichedServices && Array.isArray(currentLead.enrichedServices) && currentLead.enrichedServices.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Services: {currentLead.enrichedServices.slice(0, 4).join(', ')}{currentLead.enrichedServices.length > 4 ? ` +${currentLead.enrichedServices.length - 4} more` : ''}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="text-3xl font-bold text-blue-600 mb-4 font-mono">{currentLead.phone}</div>
              {currentLead.email && (
                <p className="text-sm text-gray-500 mb-4">{currentLead.email}</p>
              )}

              {/* Call / Skip Buttons */}
              {!callActive ? (
                <div className="flex gap-3">
                  <Button size="lg" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleCall}>
                    <Phone size={20} className="mr-2" /> Call Now
                  </Button>
                  <Button size="lg" variant="outline" onClick={skipLead} disabled={currentIndex >= queue.length - 1}>
                    <SkipForward size={20} className="mr-2" /> Skip
                  </Button>
                </div>
              ) : !connected ? (
                /* Initial outcome: did they pick up? */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Did they pick up?</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => { setCallActive(false); setCallNotes('') }}
                    >
                      <ArrowLeft size={14} className="mr-1" /> Cancel Call
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => setConnected(true)} className="bg-green-600 hover:bg-green-700 text-white" disabled={processing}>
                      <PhoneForwarded size={16} className="mr-2" /> Connected
                    </Button>
                    <Button onClick={() => handleOutcome('NO_ANSWER')} variant="outline" disabled={processing}>
                      <PhoneMissed size={16} className="mr-2" /> No Answer
                    </Button>
                    <Button onClick={() => handleOutcome('VOICEMAIL')} variant="outline" disabled={processing}>
                      <PhoneOff size={16} className="mr-2" /> Voicemail
                    </Button>
                    <Button onClick={() => handleOutcome('WRONG_NUMBER')} variant="outline" className="text-red-600" disabled={processing}>
                      <X size={16} className="mr-2" /> Wrong Number
                    </Button>
                  </div>
                </div>
              ) : (
                /* Connected: what was the result? */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-green-700">Connected — What happened?</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => setConnected(false)}
                      disabled={processing}
                    >
                      <ArrowLeft size={14} className="mr-1" /> Back
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Button onClick={() => handleOutcome('INTERESTED')} className="bg-green-600 hover:bg-green-700 text-white h-12 text-base" disabled={processing}>
                      <TrendingUp size={18} className="mr-2" /> Interested — Send Preview
                    </Button>
                    <Button onClick={() => handleOutcome('CALLBACK')} variant="outline" className="h-10" disabled={processing}>
                      <Clock size={16} className="mr-2" /> Callback Later
                    </Button>
                    <Button onClick={() => handleOutcome('NOT_INTERESTED')} variant="outline" className="h-10 text-red-600" disabled={processing}>
                      <X size={16} className="mr-2" /> Not Interested
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes field (visible during active call) */}
              {callActive && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Call Notes</label>
                  <textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Any notes from this call..."
                    className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </Card>

            {/* Preview Link Actions */}
            {currentLead.previewUrl && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Preview Link</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSendPreview('copy')}
                    >
                      {copiedPreview ? (
                        <><CheckCircle size={14} className="mr-1 text-green-600" /> Copied!</>
                      ) : (
                        <><Copy size={14} className="mr-1" /> Copy Link</>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendPreview('sms')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <MessageSquare size={14} className="mr-1" /> Text Preview
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-400 truncate">{currentLead.previewUrl}</p>
              </Card>
            )}
          </div>

          {/* Right: Call Script */}
          <Card className="p-6 h-fit">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-600" />
              Call Script
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
              {getScript()}
            </div>
          </Card>
        </div>
      )}

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Lead Info</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">First Name</label>
                <Input
                  value={editForm.firstName || ''}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Last Name</label>
                <Input
                  value={editForm.lastName || ''}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Company</label>
              <Input
                value={editForm.companyName || ''}
                onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone</label>
              <Input
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">City</label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">State</label>
                <Input
                  value={editForm.state || ''}
                  maxLength={2}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              <Save size={16} className="mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
