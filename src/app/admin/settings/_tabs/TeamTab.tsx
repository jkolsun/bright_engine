'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus, UserCheck, UserX, KeyRound, Copy, RefreshCw,
  DollarSign, Save, FileText, ChevronDown, ChevronRight,
  RotateCcw, Phone,
} from 'lucide-react'
import { useSettingsContext } from '../_lib/context'
import { AccordionSection, SectionHeader, FieldLabel, SaveButton } from '../_lib/components'
import { DEFAULT_TARGETS, DEFAULT_PERSONALIZATION } from '../_lib/defaults'

// ═══════════════════════════════════════════════════════════
//  TEAM TAB — Reps, Commissions, Rep Scripts, Per-Rep Targets
// ═══════════════════════════════════════════════════════════

export default function TeamTab() {
  return (
    <div className="space-y-4">
      <RepsSection />
      <CommissionsSection />
      <PhoneAssignmentsSection />
      <RepScriptsSection />
      <PerRepTargetsSection />
    </div>
  )
}

// ─────────────────────────────────────────────────────────
//  Section 1: Reps (ported from /admin/settings/reps/page.tsx)
// ─────────────────────────────────────────────────────────

function RepsSection() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()
  const [onboardingEnabled, setOnboardingEnabled] = useState(true)
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'REP',
    portalType: 'FULL',
  })

  // Credentials state
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({})
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRowExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleResetOnboarding = async (repId: string, repName: string) => {
    if (!confirm(`Reset onboarding for ${repName}? They will need to complete the wizard again on next login.`)) return
    try {
      const res = await fetch(`/api/users/${repId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingComplete: false }),
      })
      if (res.ok) loadReps()
    } catch (error) {
      console.error('Failed to reset onboarding:', error)
    }
  }

  useEffect(() => {
    if (settingsLoaded && rawSettings.rep_onboarding_enabled !== undefined) {
      setOnboardingEnabled(rawSettings.rep_onboarding_enabled !== false)
    }
  }, [settingsLoaded, rawSettings])

  const toggleOnboarding = async () => {
    const newValue = !onboardingEnabled
    setOnboardingEnabled(newValue)
    await saveSetting('rep_onboarding_enabled', newValue)
  }

  useEffect(() => {
    loadReps()
  }, [])

  const loadReps = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setReps(data.users || [])
      }
    } catch (error) {
      console.error('Failed to load reps:', error)
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let pw = ''
    for (let i = 0; i < 10; i++) pw += chars[Math.floor(Math.random() * chars.length)]
    return pw
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const password = formData.password || generatePassword()

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password }),
      })

      if (res.ok) {
        setDialogOpen(false)
        setCreatedCreds({ email: formData.email, password })
        setFormData({ name: '', email: '', phone: '', password: '', role: 'REP', portalType: 'FULL' })
        loadReps()
      } else {
        alert('Failed to create rep account')
      }
    } catch (error) {
      console.error('Error creating rep:', error)
      alert('Failed to create rep account')
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    const newPassword = resetPassword || generatePassword()
    setResetting(true)
    try {
      const res = await fetch(`/api/users/${resetTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        setResetResult(newPassword)
        setResetPassword('')
      } else {
        alert('Failed to reset password')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('Failed to reset password')
    } finally {
      setResetting(false)
    }
  }

  const toggleStatus = async (repId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      const res = await fetch(`/api/users/${repId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        loadReps()
      }
    } catch (error) {
      console.error('Failed to update rep status:', error)
    }
  }

  const handleDeleteRep = async (repId: string, repName: string) => {
    if (!confirm(`Are you sure you want to delete ${repName}? This marks them as INACTIVE.`)) {
      return
    }
    try {
      const res = await fetch(`/api/users/${repId}`, { method: 'DELETE' })
      if (res.ok) {
        alert('Rep deleted successfully')
        loadReps()
      } else {
        alert('Failed to delete rep')
      }
    } catch (error) {
      console.error('Error deleting rep:', error)
      alert('Failed to delete rep')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const repUsers = reps.filter((r) => r.role === 'REP')

  return (
    <AccordionSection title="Reps" description="Add, edit, and manage your sales reps" defaultOpen>
      <div className="space-y-6 pt-4">
        {/* Onboarding Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Rep Onboarding Wizard</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              When enabled, new reps must complete the onboarding wizard before accessing the dashboard.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {savingKey === 'rep_onboarding_enabled' && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
            {savedKey === 'rep_onboarding_enabled' && (
              <span className="text-xs text-green-600">Saved</span>
            )}
            <button
              onClick={toggleOnboarding}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                onboardingEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                onboardingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Header with Add Rep button */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Team Members</h4>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Add Rep
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Rep Account</DialogTitle>
                  <DialogDescription>Add a new sales rep to your team</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="rep-name" className="text-sm font-medium">
                      Full Name *
                    </label>
                    <Input
                      id="rep-name"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Sarah Johnson"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rep-email" className="text-sm font-medium">
                      Email *
                    </label>
                    <Input
                      id="rep-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="sarah@company.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rep-phone" className="text-sm font-medium">
                      Phone
                    </label>
                    <Input
                      id="rep-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rep-password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="rep-password"
                        value={formData.password}
                        onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Leave blank to auto-generate"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setFormData((prev) => ({ ...prev, password: generatePassword() }))}
                      >
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400">
                      If blank, a random password will be generated and shown after creation.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="rep-role" className="text-sm font-medium">
                      Role
                    </label>
                    <select
                      id="rep-role"
                      value={formData.role}
                      onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="REP">Sales Rep</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  {formData.role === 'REP' && (
                    <div className="space-y-2">
                      <label htmlFor="rep-portalType" className="text-sm font-medium">
                        Portal Type
                      </label>
                      <select
                        id="rep-portalType"
                        value={formData.portalType}
                        onChange={(e) => setFormData((prev) => ({ ...prev, portalType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="FULL">Full-Time</option>
                        <option value="PART_TIME">Part-Time</option>
                      </select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Rep</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Created Credentials Banner */}
        {createdCreds && (
          <Card className="p-4 border-green-200 bg-green-50">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Rep Account Created</h4>
                <p className="text-sm text-green-700 mb-2">Share these login credentials with the rep:</p>
                <div className="bg-white rounded-md p-3 border border-green-200 space-y-1 font-mono text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20">Email:</span>
                    <span className="font-medium">{createdCreds.email}</span>
                    <button onClick={() => copyToClipboard(createdCreds.email)} className="text-gray-400 hover:text-gray-600">
                      <Copy size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20">Password:</span>
                    <span className="font-medium">{createdCreds.password}</span>
                    <button onClick={() => copyToClipboard(createdCreds.password)} className="text-gray-400 hover:text-gray-600">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    copyToClipboard(`Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`)
                  }}
                  className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
                >
                  Copy both to clipboard
                </button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setCreatedCreds(null)} className="text-green-600">
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Total Reps</div>
            <div className="text-3xl font-bold text-gray-900">{repUsers.length}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Active</div>
            <div className="text-3xl font-bold text-green-600">
              {repUsers.filter((r) => r.status === 'ACTIVE').length}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-gray-600 mb-1">Inactive</div>
            <div className="text-3xl font-bold text-gray-400">
              {repUsers.filter((r) => r.status === 'INACTIVE').length}
            </div>
          </Card>
        </div>

        {/* Reps Table */}
        <Card>
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading reps...</div>
          ) : reps.length === 0 ? (
            <div className="p-12 text-center">
              <UserCheck size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reps yet</h3>
              <p className="text-gray-600 mb-4">Add your first sales rep to get started</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus size={18} className="mr-2" />
                Add Rep
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-8 p-4"></th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Email</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Onboarding</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Stripe</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reps.map((rep) => {
                    const isExpanded = expandedRows.has(rep.id)
                    const stripeStatus = rep.stripeConnectStatus || 'not_started'
                    const hours = rep.availableHours as Record<string, { active: boolean; start: string; end: string }> | null
                    const formatHoursSummary = () => {
                      if (!hours) return 'Not set'
                      const activeDays = Object.entries(hours)
                        .filter(([, v]) => v.active)
                        .map(([d]) => d.slice(0, 3))
                      if (activeDays.length === 0) return 'Not set'
                      const firstEntry = Object.values(hours).find(v => v.active)
                      const timeRange = firstEntry ? `${firstEntry.start}-${firstEntry.end}` : ''
                      return `${activeDays.join(', ')} ${timeRange}`
                    }
                    const stripeVariant = stripeStatus === 'active' ? 'default' : stripeStatus === 'pending' ? 'secondary' : stripeStatus === 'restricted' ? 'destructive' : 'outline'
                    const stripeLabel = stripeStatus === 'active' ? 'Connected' : stripeStatus === 'pending' ? 'Pending' : stripeStatus === 'restricted' ? 'Restricted' : 'Not Started'
                    return (
                      <React.Fragment key={rep.id}>
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => rep.role === 'REP' && toggleRowExpanded(rep.id)}>
                          <td className="p-4 text-gray-400">
                            {rep.role === 'REP' && (
                              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                            )}
                          </td>
                          <td className="p-4 font-medium text-gray-900">{rep.name}</td>
                          <td className="p-4 text-gray-700">{rep.email}</td>
                          <td className="p-4">
                            {rep.role === 'REP' ? (
                              <Badge variant={rep.portalType === 'PART_TIME' ? 'outline' : 'secondary'}>
                                {rep.portalType === 'PART_TIME' ? 'Part-Time' : 'Full-Time'}
                              </Badge>
                            ) : (
                              <Badge variant="default">ADMIN</Badge>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge variant={rep.status === 'ACTIVE' ? 'default' : 'secondary'}>{rep.status}</Badge>
                          </td>
                          <td className="p-4">
                            {rep.role === 'REP' ? (
                              <Badge variant={rep.onboardingComplete ? 'default' : 'outline'}>
                                {rep.onboardingComplete ? 'Complete' : 'Incomplete'}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">&mdash;</span>
                            )}
                          </td>
                          <td className="p-4">
                            {rep.role === 'REP' ? (
                              <Badge variant={stripeVariant as any}>{stripeLabel}</Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">&mdash;</span>
                            )}
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => toggleStatus(rep.id, rep.status)}>
                                {rep.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteRep(rep.id, rep.name)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded Detail Row */}
                        {isExpanded && rep.role === 'REP' && (
                          <tr className="bg-gray-50/80">
                            <td colSpan={8} className="px-8 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Personal Phone</p>
                                  <p className="text-gray-900">{rep.personalPhone || 'Not provided'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Timezone</p>
                                  <p className="text-gray-900">{rep.timezone || 'Not set'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Available Hours</p>
                                  <p className="text-gray-900">{formatHoursSummary()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Stripe Connect ID</p>
                                  {rep.stripeConnectId ? (
                                    <a
                                      href={`https://dashboard.stripe.com/connect/accounts/${rep.stripeConnectId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 font-mono text-xs underline"
                                    >
                                      {rep.stripeConnectId}
                                    </a>
                                  ) : (
                                    <p className="text-gray-900 font-mono text-xs">None</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Terms Agreed</p>
                                  <p className="text-gray-900">
                                    {rep.agreedToTermsAt
                                      ? new Date(rep.agreedToTermsAt).toLocaleDateString()
                                      : 'Not yet'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium mb-1">Commission Rate</p>
                                  <p className="text-gray-900">{rep.commissionRate ? `${(rep.commissionRate * 100).toFixed(0)}%` : 'Not set'}</p>
                                </div>
                              </div>
                              {/* Voicemail Recordings */}
                              {(rep.outboundVmUrl || rep.inboundVmUrl) && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <p className="text-gray-500 font-medium mb-2">Voicemail Recordings</p>
                                  <div className="space-y-3">
                                    {rep.outboundVmUrl && (
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-sm font-medium text-gray-700 w-28">Outbound VM:</span>
                                        <audio src={rep.outboundVmUrl} controls className="h-8" />
                                        <Badge variant={rep.outboundVmApproved ? 'default' : 'secondary'} className={rep.outboundVmApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                          {rep.outboundVmApproved ? 'Approved' : 'Pending'}
                                        </Badge>
                                        {!rep.outboundVmApproved && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                              onClick={async () => {
                                                await fetch(`/api/users/${rep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outboundVmApproved: true }) })
                                                setReps(reps.map(r => r.id === rep.id ? { ...r, outboundVmApproved: true } : r))
                                              }}
                                            >
                                              <UserCheck size={14} /> Approve
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                              onClick={async () => {
                                                await fetch(`/api/users/${rep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outboundVmUrl: null, outboundVmApproved: false }) })
                                                setReps(reps.map(r => r.id === rep.id ? { ...r, outboundVmUrl: null, outboundVmApproved: false } : r))
                                              }}
                                            >
                                              <UserX size={14} /> Reject
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    {rep.inboundVmUrl && (
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-sm font-medium text-gray-700 w-28">Inbound VM:</span>
                                        <audio src={rep.inboundVmUrl} controls className="h-8" />
                                        <Badge variant={rep.inboundVmApproved ? 'default' : 'secondary'} className={rep.inboundVmApproved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                          {rep.inboundVmApproved ? 'Approved' : 'Pending'}
                                        </Badge>
                                        {!rep.inboundVmApproved && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-1 text-green-600 border-green-200 hover:bg-green-50"
                                              onClick={async () => {
                                                await fetch(`/api/users/${rep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inboundVmApproved: true }) })
                                                setReps(reps.map(r => r.id === rep.id ? { ...r, inboundVmApproved: true } : r))
                                              }}
                                            >
                                              <UserCheck size={14} /> Approve
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                              onClick={async () => {
                                                await fetch(`/api/users/${rep.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inboundVmUrl: null, inboundVmApproved: false }) })
                                                setReps(reps.map(r => r.id === rep.id ? { ...r, inboundVmUrl: null, inboundVmApproved: false } : r))
                                              }}
                                            >
                                              <UserX size={14} /> Reject
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              {rep.onboardingComplete && (
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50"
                                    onClick={() => handleResetOnboarding(rep.id, rep.name)}
                                  >
                                    <RotateCcw size={14} />
                                    Reset Onboarding
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Login Credentials */}
        {repUsers.length > 0 && (
          <Card>
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <KeyRound size={20} className="text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Login Credentials</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">View and reset rep login passwords</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Email (Login)</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Password</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {repUsers.map((rep) => (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{rep.name}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-mono text-sm">{rep.email}</span>
                          <button onClick={() => copyToClipboard(rep.email)} className="text-gray-400 hover:text-gray-600">
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={rep.portalType === 'PART_TIME' ? 'outline' : 'secondary'}>
                          {rep.portalType === 'PART_TIME' ? 'Part-Time' : 'Full-Time'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {visiblePasswords[rep.id] ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">
                              {visiblePasswords[rep.id]}
                            </span>
                            <button onClick={() => copyToClipboard(visiblePasswords[rep.id])} className="text-gray-400 hover:text-gray-600">
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() =>
                                setVisiblePasswords((prev) => {
                                  const n = { ...prev }
                                  delete n[rep.id]
                                  return n
                                })
                              }
                              className="text-gray-400 hover:text-gray-600"
                            >
                              {/* EyeOff inline SVG to avoid extra import */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm font-mono">********</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setResetTarget(rep)
                            setResetPassword('')
                            setResetResult(null)
                            setResetDialogOpen(true)
                          }}
                        >
                          <RefreshCw size={14} />
                          Reset Password
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Reset Password Dialog */}
        <Dialog
          open={resetDialogOpen}
          onOpenChange={(open) => {
            setResetDialogOpen(open)
            if (!open) setResetResult(null)
          }}
        >
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Reset the password for {resetTarget?.name} ({resetTarget?.email})
              </DialogDescription>
            </DialogHeader>
            {resetResult ? (
              <div className="py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800 mb-2">Password has been reset!</p>
                  <div className="bg-white rounded-md p-3 border border-green-200 font-mono text-sm flex items-center justify-between">
                    <span>{resetResult}</span>
                    <button onClick={() => copyToClipboard(resetResult)} className="text-gray-400 hover:text-gray-600 ml-2">
                      <Copy size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      copyToClipboard(`Email: ${resetTarget?.email}\nNew Password: ${resetResult}`)
                    }}
                    className="text-xs text-green-600 hover:text-green-800 mt-2 underline"
                  >
                    Copy email + password to clipboard
                  </button>
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    onClick={() => {
                      if (resetTarget) {
                        setVisiblePasswords((prev) => ({ ...prev, [resetTarget.id]: resetResult }))
                      }
                      setResetDialogOpen(false)
                      setResetResult(null)
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="flex gap-2">
                    <Input
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Leave blank to auto-generate"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setResetPassword(generatePassword())}
                    >
                      Generate
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleResetPassword} disabled={resetting}>
                    {resetting ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AccordionSection>
  )
}

// ─────────────────────────────────────────────────────────
//  Section 2: Commissions (ported from /admin/settings/commission/page.tsx)
// ─────────────────────────────────────────────────────────

function CommissionsSection() {
  const [reps, setReps] = useState<any[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [buildFee, setBuildFee] = useState(149)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadReps()
    fetch('/api/settings/pricing')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.siteBuildFee) setBuildFee(d.siteBuildFee)
      })
      .catch(err => console.warn('[TeamTab] Pricing fetch failed:', err))
  }, [])

  const loadReps = async () => {
    try {
      const res = await fetch('/api/users?role=REP')
      if (res.ok) {
        const data = await res.json()
        setReps(data.users || [])

        // Initialize rates
        const initialRates: Record<string, number> = {}
        data.users?.forEach((rep: any) => {
          initialRates[rep.id] = rep.commissionRate ?? 0.5
        })
        setRates(initialRates)
      }
    } catch (error) {
      console.error('Failed to load reps:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      for (const [repId, rate] of Object.entries(rates)) {
        await fetch(`/api/users/${repId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commissionRate: rate }),
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save rates:', error)
      alert('Failed to save commission rates')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccordionSection title="Commissions" description="Set per-rep commission percentages">
      <div className="space-y-4 pt-4">
        <Card className="p-6 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>How it works:</strong> Set the percentage of each closed deal that goes to the rep. For example, 50%
            means the rep gets ${(buildFee * 0.5).toFixed(2)} on a ${buildFee} site build.
          </p>
        </Card>

        {loading ? (
          <div className="text-center py-6 text-gray-500 text-sm">Loading commission data...</div>
        ) : reps.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No reps yet</p>
        ) : (
          <>
            {reps.map((rep) => (
              <div key={rep.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{rep.name}</div>
                  <div className="text-sm text-gray-500">{rep.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={(rates[rep.id] || 0.5) * 100}
                    onChange={(e) => {
                      setRates((prev) => ({
                        ...prev,
                        [rep.id]: parseInt(e.target.value) / 100,
                      }))
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-600">%</span>
                </div>
              </div>
            ))}

            <div className="pt-4 flex justify-end">
              <SaveButton onClick={handleSave} saving={saving} saved={saved} />
            </div>
          </>
        )}

        <Card className="p-6 bg-amber-50 border-amber-200">
          <h3 className="font-semibold text-gray-900 mb-2">Tips</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Standard rate: 50% (split between rep and operations)</li>
            <li>Top performers: 60% (bonus for high closes)</li>
            <li>New reps: 40% (training period)</li>
            <li>Rates can be adjusted monthly based on performance</li>
          </ul>
        </Card>
      </div>
    </AccordionSection>
  )
}

// ─────────────────────────────────────────────────────────
//  Section 3: Rep Scripts (moved from Personalization tab)
// ─────────────────────────────────────────────────────────

function RepScriptsSection() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [script, setScript] = useState('')
  const [sellingPoints, setSellingPoints] = useState('')
  const [objections, setObjections] = useState('')
  const [upsells, setUpsells] = useState('')

  useEffect(() => {
    if (!settingsLoaded) return
    const guide = rawSettings.call_guide_content
    if (guide && typeof guide === 'object') {
      setScript(guide.script ?? '')
      setSellingPoints(guide.sellingPoints ?? '')
      setObjections(guide.objections ?? '')
      setUpsells(guide.upsells ?? '')
    }
  }, [settingsLoaded, rawSettings.call_guide_content])

  const handleSave = () => {
    saveSetting('call_guide_content', { script, sellingPoints, objections, upsells })
  }

  return (
    <AccordionSection title="Rep Scripts" description="Call script, selling points, and objection handling shown to reps in the dialer">
      <div className="space-y-4 pt-4">
        <div>
          <FieldLabel>Call Script</FieldLabel>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full h-48 p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Hi {{firstName}}, this is [Rep Name] with Bright Engine..."
          />
        </div>
        <div>
          <FieldLabel>Selling Points</FieldLabel>
          <textarea
            value={sellingPoints}
            onChange={(e) => setSellingPoints(e.target.value)}
            className="w-full h-32 p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="• Professional website built in 48 hours&#10;• No upfront cost — just $199/mo&#10;• We handle everything: hosting, updates, SEO"
          />
        </div>
        <div>
          <FieldLabel>Common Objections</FieldLabel>
          <textarea
            value={objections}
            onChange={(e) => setObjections(e.target.value)}
            className="w-full h-32 p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="&quot;I already have a website&quot; → Great! We can review it and show you where you're leaving money on the table...&#10;&#10;&quot;I'm not interested&quot; → Totally understand. Quick question — are you getting new customers from Google right now?"
          />
        </div>
        <div>
          <FieldLabel>Upsell Opportunities</FieldLabel>
          <textarea
            value={upsells}
            onChange={(e) => setUpsells(e.target.value)}
            className="w-full h-24 p-4 border rounded-lg font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="• Google Business Profile optimization&#10;• Monthly SEO package&#10;• Social media integration"
          />
        </div>
        <p className="text-xs text-gray-400">
          Available variables: {'{{firstName}}'}, {'{{companyName}}'}, {'{{industry}}'}, {'{{city}}'}, {'{{state}}'}
        </p>
        <div className="flex justify-end">
          <SaveButton
            onClick={handleSave}
            saving={savingKey === 'call_guide_content'}
            saved={savedKey === 'call_guide_content'}
          />
        </div>
      </div>
    </AccordionSection>
  )
}

// ─────────────────────────────────────────────────────────
//  Section 3.5: Phone Assignments — Assign Twilio dialer numbers to reps
// ─────────────────────────────────────────────────────────

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  return phone
}

function PhoneAssignmentsSection() {
  const [reps, setReps] = useState<{ id: string; name: string; status: string; assignedDialerPhone?: string | null }[]>([])
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([])
  const [assignments, setAssignments] = useState<Record<string, string>>({}) // repId → phone
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [repsRes, numbersRes] = await Promise.all([
        fetch('/api/reps'),
        fetch('/api/dialer/numbers'),
      ])
      if (repsRes.ok) {
        const data = await repsRes.json()
        const activeReps = (data.reps || []).filter((r: any) => r.status === 'ACTIVE')
        setReps(activeReps)
        // Initialize assignments from current rep data
        const current: Record<string, string> = {}
        for (const rep of activeReps) {
          if (rep.assignedDialerPhone) current[rep.id] = rep.assignedDialerPhone
        }
        setAssignments(current)
      }
      if (numbersRes.ok) {
        const data = await numbersRes.json()
        setAvailableNumbers(data.numbers || [])
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleAssign = (repId: string, phone: string) => {
    setAssignments(prev => {
      const updated = { ...prev }
      if (!phone) {
        delete updated[repId]
      } else {
        updated[repId] = phone
      }
      return updated
    })
    setSaved(false)
  }

  const getAssignedTo = (phone: string, excludeRepId: string): string | null => {
    for (const rep of reps) {
      if (rep.id !== excludeRepId && assignments[rep.id] === phone) return rep.name
    }
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Update each rep's assigned phone (also set twilioNumber1 so the dialer can use it for caller ID)
      await Promise.all(
        reps.map(rep =>
          fetch(`/api/users/${rep.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignedDialerPhone: assignments[rep.id] || null,
              twilioNumber1: assignments[rep.id] || null,
            }),
          })
        )
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  return (
    <AccordionSection title="Phone Assignments" description="Assign Twilio dialer numbers to reps for cold calling">
      <div className="space-y-4 pt-4">
        {loading ? (
          <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
        ) : availableNumbers.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No dialer numbers configured. Add TWILIO_REP1_NUMBER_PRIMARY / TWILIO_REP2_NUMBER_PRIMARY to your environment variables.
          </div>
        ) : reps.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No active reps found.
          </div>
        ) : (
          <div className="space-y-3">
            {reps.map((rep) => {
              const assigned = assignments[rep.id] || ''
              return (
                <div
                  key={rep.id}
                  className={`p-4 rounded-lg border ${
                    assigned ? 'border-teal-200 bg-teal-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                        {rep.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{rep.name}</span>
                      {assigned && (
                        <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700">
                          <Phone className="w-3 h-3 mr-1" />
                          Assigned
                        </Badge>
                      )}
                    </div>
                    <select
                      value={assigned}
                      onChange={(e) => handleAssign(rep.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white min-w-[200px]"
                    >
                      <option value="">Unassigned</option>
                      {availableNumbers.map((num) => {
                        const takenBy = getAssignedTo(num, rep.id)
                        return (
                          <option key={num} value={num} disabled={!!takenBy}>
                            {formatPhoneDisplay(num)}{takenBy ? ` (${takenBy})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Reps without an assigned number will use the first available dialer number.
          </p>
          <SaveButton
            onClick={handleSave}
            saving={saving}
            saved={saved}
          />
        </div>
      </div>
    </AccordionSection>
  )
}

// ─────────────────────────────────────────────────────────
//  Section 4: Per-Rep Targets (moved from Targets tab)
// ─────────────────────────────────────────────────────────

function PerRepTargetsSection() {
  const { rawSettings, settingsLoaded, saveSetting, savingKey, savedKey } = useSettingsContext()

  const [reps, setReps] = useState<{ id: string; name: string; status: string }[]>([])
  const [loadingReps, setLoadingReps] = useState(false)
  const [repTargets, setRepTargets] = useState<Record<string, typeof DEFAULT_TARGETS>>({})
  const [targets, setTargets] = useState(DEFAULT_TARGETS)

  // Load reps on mount
  useEffect(() => {
    fetchReps()
  }, [])

  // Initialize from rawSettings once loaded
  useEffect(() => {
    if (!settingsLoaded) return
    if (rawSettings.rep_targets && typeof rawSettings.rep_targets === 'object') {
      setRepTargets(rawSettings.rep_targets)
    }
    if (rawSettings.targets && typeof rawSettings.targets === 'object') {
      setTargets({ ...DEFAULT_TARGETS, ...rawSettings.targets })
    }
  }, [settingsLoaded, rawSettings.rep_targets, rawSettings.targets])

  const fetchReps = async () => {
    setLoadingReps(true)
    try {
      const res = await fetch('/api/reps')
      if (res.ok) {
        const data = await res.json()
        setReps((data.reps || []).filter((r: any) => r.status === 'ACTIVE'))
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingReps(false)
    }
  }

  const getRepTarget = (repId: string, field: keyof typeof DEFAULT_TARGETS) => {
    return repTargets[repId]?.[field] ?? targets[field]
  }

  const setRepTarget = (repId: string, field: keyof typeof DEFAULT_TARGETS, value: number) => {
    setRepTargets((prev) => ({
      ...prev,
      [repId]: {
        ...DEFAULT_TARGETS,
        ...prev[repId],
        [field]: value,
      },
    }))
  }

  const resetRepTargets = (repId: string) => {
    setRepTargets((prev) => {
      const updated = { ...prev }
      delete updated[repId]
      return updated
    })
  }

  return (
    <AccordionSection title="Per-Rep Targets" description="Override default targets for specific reps">
      <div className="space-y-4 pt-4">
        {loadingReps ? (
          <div className="text-center py-6 text-gray-500 text-sm">Loading reps...</div>
        ) : reps.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            No active reps found. Add reps in the Reps section above.
          </div>
        ) : (
          <div className="space-y-4">
            {reps.map((rep) => {
              const hasCustom = !!repTargets[rep.id]
              return (
                <div
                  key={rep.id}
                  className={`p-4 rounded-lg border ${
                    hasCustom ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {rep.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">{rep.name}</span>
                      {hasCustom && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Custom</span>
                      )}
                    </div>
                    {hasCustom && (
                      <button
                        onClick={() => resetRepTargets(rep.id)}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Reset to defaults
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Dials/Day</label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-sm"
                        value={getRepTarget(rep.id, 'dailyDials')}
                        onChange={(e) => setRepTarget(rep.id, 'dailyDials', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Conversations/Day</label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-sm"
                        value={getRepTarget(rep.id, 'dailyConversations')}
                        onChange={(e) => setRepTarget(rep.id, 'dailyConversations', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Closes/Day</label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-sm"
                        value={getRepTarget(rep.id, 'dailyCloses')}
                        onChange={(e) => setRepTarget(rep.id, 'dailyCloses', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Lead Cap/Day</label>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-sm"
                        value={getRepTarget(rep.id, 'dailyLeadCap')}
                        onChange={(e) => setRepTarget(rep.id, 'dailyLeadCap', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">Reps without custom targets use the defaults from the Targets tab.</p>
          <SaveButton
            onClick={() => saveSetting('rep_targets', repTargets)}
            saving={savingKey === 'rep_targets'}
            saved={savedKey === 'rep_targets'}
          />
        </div>
      </div>
    </AccordionSection>
  )
}
