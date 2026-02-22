'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { Users, UserPlus, Edit, Trash2, ArrowLeft, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type ViewMode = 'list' | 'edit' | 'create'
type FilterType = 'all' | 'FULL' | 'PART_TIME'

export default function RepsPage() {
  const [reps, setReps] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [commissions, setCommissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedRep, setSelectedRep] = useState<any>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  // Deactivation dialog
  const [deactivateRep, setDeactivateRep] = useState<any>(null)
  const [reassignTo, setReassignTo] = useState<string>('')
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [repsRes, leadsRes, commRes] = await Promise.all([
        fetch('/api/users?role=REP'),
        fetch('/api/leads?limit=500'),
        fetch('/api/commissions'),
      ])
      setReps(repsRes.ok ? (await repsRes.json()).users || [] : [])
      setLeads(leadsRes.ok ? (await leadsRes.json()).leads || [] : [])
      setCommissions(commRes.ok ? (await commRes.json()).commissions || [] : [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filteredReps = filter === 'all' ? reps : reps.filter(r => r.portalType === filter)

  const getRepStats = (rep: any) => {
    const assigned = leads.filter(l => l.assignedToId === rep.id)
    const closed = assigned.filter(l => l.status === 'PAID')
    const totalComm = commissions
      .filter(c => c.repId === rep.id || c.rep?.id === rep.id)
      .reduce((s, c) => s + (c.amount || 0), 0)
    return { assigned: assigned.length, closed: closed.length, commission: totalComm }
  }

  const handleSaveRep = async (repData: any) => {
    try {
      const res = await fetch(`/api/users/${selectedRep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repData),
      })
      if (res.ok) {
        await loadData()
        setViewMode('list')
        setSelectedRep(null)
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Save failed: ${err.error || 'Unknown error'}`)
      }
    } catch (e) { console.error(e) }
  }

  const handleCreateRep = async (repData: any) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...repData, role: 'REP' }),
      })
      if (res.ok) {
        await loadData()
        setViewMode('list')
      } else {
        const err = await res.json().catch(() => ({}))
        alert(`Create failed: ${err.error || 'Unknown error'}`)
      }
    } catch (e) { console.error(e) }
  }

  const handleDeleteRep = (repId: string, _repName: string) => {
    const rep = reps.find(r => r.id === repId)
    if (rep) {
      setDeactivateRep(rep)
      setReassignTo('')
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateRep) return
    setDeactivating(true)
    try {
      // Deactivate rep
      await fetch(`/api/users/${deactivateRep.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INACTIVE' }),
      })

      // Reassign leads if a target rep is selected
      if (reassignTo) {
        const repLeads = leads.filter(l => l.assignedToId === deactivateRep.id && l.status !== 'PAID' && l.status !== 'CLOSED_LOST')
        for (const lead of repLeads) {
          try {
            await fetch(`/api/admin/leads/${lead.id}/reassign`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newRepId: reassignTo, reason: `Rep ${deactivateRep.name} deactivated` }),
            })
          } catch { /* continue with other leads */ }
        }
      }

      await loadData()
      setDeactivateRep(null)
    } catch (e) { console.error(e) }
    finally { setDeactivating(false) }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users size={22} className="text-white" />
          </div>
          <p className="text-gray-500 font-medium">Loading sales team...</p>
        </div>
      </div>
    )
  }

  if (viewMode === 'edit' || viewMode === 'create') {
    return (
      <RepEditForm
        rep={viewMode === 'edit' ? selectedRep : null}
        onSave={viewMode === 'edit' ? handleSaveRep : handleCreateRep}
        onBack={() => { setViewMode('list'); setSelectedRep(null) }}
      />
    )
  }

  const totalReps = reps.length
  const activeReps = reps.filter(r => r.status === 'ACTIVE').length
  const ftCount = reps.filter(r => r.portalType === 'FULL').length
  const ptCount = reps.filter(r => r.portalType === 'PART_TIME').length
  const totalComm = commissions.reduce((s, c) => s + (c.amount || 0), 0)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Team</h1>
          <p className="text-gray-500 mt-1">Manage FT and PT reps in one place</p>
        </div>
        <Button onClick={() => setViewMode('create')} className="gap-2">
          <UserPlus size={18} /> Add Rep
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 rounded-xl"><div className="text-sm text-gray-500">Total</div><div className="text-2xl font-bold">{totalReps}</div></Card>
        <Card className="p-4 rounded-xl"><div className="text-sm text-gray-500">Active</div><div className="text-2xl font-bold text-green-600">{activeReps}</div></Card>
        <Card className="p-4 rounded-xl"><div className="text-sm text-gray-500">Full-Time</div><div className="text-2xl font-bold text-blue-600">{ftCount}</div></Card>
        <Card className="p-4 rounded-xl"><div className="text-sm text-gray-500">Part-Time</div><div className="text-2xl font-bold text-purple-600">{ptCount}</div></Card>
        <Card className="p-4 rounded-xl"><div className="text-sm text-gray-500">Total Commissions</div><div className="text-2xl font-bold text-amber-600">{formatCurrency(totalComm)}</div></Card>
      </div>

      <div className="flex gap-2">
        {([
          { key: 'all' as FilterType, label: 'All Reps' },
          { key: 'FULL' as FilterType, label: 'Full-Time' },
          { key: 'PART_TIME' as FilterType, label: 'Part-Time' },
        ]).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key ? 'bg-slate-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card className="rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Leads</th>
              <th className="px-4 py-3">Closed</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Rate</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReps.map(rep => {
              const stats = getRepStats(rep)
              return (
                <tr key={rep.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedRep(rep); setViewMode('edit') }}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{rep.name}</div>
                    <div className="text-xs text-gray-500">{rep.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={rep.portalType === 'FULL' ? 'default' : 'secondary'}>
                      {rep.portalType === 'FULL' ? 'FT' : 'PT'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className={rep.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}
                    >
                      {rep.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{stats.assigned}</td>
                  <td className="px-4 py-3 text-sm font-medium">{stats.closed}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-600">{formatCurrency(stats.commission)}</td>
                  <td className="px-4 py-3 text-sm">{((rep.commissionRate || 0) * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { setSelectedRep(rep); setViewMode('edit') }}>
                        <Edit size={14} />
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-lg text-red-500 hover:bg-red-50" onClick={() => handleDeleteRep(rep.id, rep.name)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredReps.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No reps found</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Deactivation Dialog */}
      {deactivateRep && (() => {
        const repLeads = leads.filter(l => l.assignedToId === deactivateRep.id && l.status !== 'PAID' && l.status !== 'CLOSED_LOST')
        const repClients = leads.filter(l => l.assignedToId === deactivateRep.id && l.status === 'PAID')
        const repComm = commissions.filter(c => c.repId === deactivateRep.id || c.rep?.id === deactivateRep.id)
        const pendingComm = repComm.filter(c => c.status === 'PENDING').reduce((s: number, c: any) => s + (c.amount || 0), 0)
        const otherActiveReps = reps.filter(r => r.status === 'ACTIVE' && r.id !== deactivateRep.id)

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Deactivate {deactivateRep.name}?</h3>
                  <p className="text-sm text-gray-500">This rep will no longer be able to log in or receive leads.</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-1 text-sm">
                <p className="text-gray-700">This rep currently has:</p>
                <p className="font-medium text-gray-900">{repLeads.length} assigned leads</p>
                <p className="font-medium text-gray-900">{repClients.length} active client{repClients.length !== 1 ? 's' : ''}</p>
                {pendingComm > 0 && (
                  <p className="font-medium text-amber-600">{formatCurrency(pendingComm)} in pending commissions</p>
                )}
              </div>

              {repLeads.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Reassign {repLeads.length} leads to:</label>
                  <select
                    value={reassignTo}
                    onChange={(e) => setReassignTo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Leave unassigned</option>
                    {otherActiveReps.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <p className="text-xs text-gray-400 mb-4">Existing commission records will remain. Unreleased payouts can still be managed from the Payouts page.</p>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setDeactivateRep(null)} disabled={deactivating}>Cancel</Button>
                <Button size="sm" onClick={confirmDeactivate} disabled={deactivating} className="bg-red-600 hover:bg-red-700 text-white">
                  {deactivating ? 'Deactivating...' : `Deactivate ${deactivateRep.name}`}
                </Button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function RepEditForm({ rep, onSave, onBack }: { rep: any; onSave: (data: any) => void; onBack: () => void }) {
  const isNew = !rep
  const [name, setName] = useState(rep?.name || '')
  const [email, setEmail] = useState(rep?.email || '')
  const [phone, setPhone] = useState(rep?.phone || '')
  const [portalType, setPortalType] = useState(rep?.portalType || 'FULL')
  const [status, setStatus] = useState(rep?.status || 'ACTIVE')
  const [commissionRate, setCommissionRate] = useState(
    rep?.commissionRate !== undefined ? (rep.commissionRate * 100).toString() : '50'
  )
  const [dailyLeadCap, setDailyLeadCap] = useState(rep?.dailyLeadCap?.toString() || '25')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    const data: any = {
      name, email, phone, portalType, status,
      commissionRate: parseFloat(commissionRate) / 100,
      dailyLeadCap: parseInt(dailyLeadCap),
    }
    if (password) data.password = password
    await onSave(data)
    setSaving(false)
  }

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> Back to Sales Team
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isNew ? 'Add New Rep' : `Edit: ${rep.name}`}</h1>

      <div className="space-y-6">
        <Card className="p-6 space-y-4 rounded-xl">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Basic Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="rep@email.com" className="rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" className="rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">{isNew ? 'Password' : 'Reset Password'}</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isNew ? 'Login password' : 'Leave blank to keep current'} className="rounded-lg" />
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 rounded-xl">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Role & Status</h3>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
            <div className="flex gap-2">
              {[
                { key: 'FULL', label: 'Full-Time', desc: 'Full dialer access, daily targets' },
                { key: 'PART_TIME', label: 'Part-Time', desc: 'Flexible hours, pace tracking' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setPortalType(t.key)}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border transition-colors text-left ${
                    portalType === t.key
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <div>{t.label}</div>
                  <div className="text-xs font-normal mt-0.5 opacity-70">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
            <div className="flex gap-2">
              {['ACTIVE', 'INACTIVE', 'SUSPENDED'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    status === s
                      ? s === 'ACTIVE' ? 'bg-green-50 border-green-300 text-green-700'
                        : s === 'SUSPENDED' ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700'
                      : 'bg-white border-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4 rounded-xl">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Commission & Targets</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Commission Rate (%)</label>
              <Input type="number" min="0" max="100" step="5" value={commissionRate} onChange={e => setCommissionRate(e.target.value)} className="rounded-lg" />
              <p className="text-xs text-gray-400 mt-1">Standard: 50%. Top performers: 60%.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Daily Lead Cap</label>
              <Input type="number" min="1" max="100" value={dailyLeadCap} onChange={e => setDailyLeadCap(e.target.value)} className="rounded-lg" />
              <p className="text-xs text-gray-400 mt-1">Max leads assigned per day</p>
            </div>
          </div>
        </Card>

        {!isNew && (
          <Card className="p-6 space-y-3 rounded-xl">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Activity Summary</h3>
            <p className="text-xs text-gray-400">Read-only — sourced from rep activity tracking</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Total Closes</div>
                <div className="text-xl font-bold text-gray-900">{rep.totalCloses || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Commission Rate</div>
                <div className="text-xl font-bold text-gray-900">{((rep.commissionRate || 0) * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500">Member Since</div>
                <div className="text-xl font-bold text-gray-900">{new Date(rep.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3 pt-2">
          <Button onClick={handleSubmit} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white px-8">
            {saving ? 'Saving...' : isNew ? 'Create Rep' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={onBack}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
