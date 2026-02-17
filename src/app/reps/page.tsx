'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import {
  Phone,
  Target,
  DollarSign,
  Users,
  CheckCircle,
  MessageSquare,
  Copy,
  Edit3,
  Save,
  Eye,
} from 'lucide-react'
import Link from 'next/link'

export default function RepsPage() {
  const [repData, setRepData] = useState<any>(null)
  const [assignedLeads, setAssignedLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Edit lead state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRepData()
  }, [])

  const loadRepData = async () => {
    try {
      const meRes = await fetch('/api/auth/me')

      if (!meRes.ok) {
        console.error('Not authenticated')
        setLoading(false)
        return
      }

      const meData = await meRes.json()
      const currentUser = meData.user
      setRepData(currentUser)

      const leadsRes = await fetch(`/api/leads?assignedTo=${currentUser.id}&limit=200`)
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setAssignedLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Failed to load rep data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPreview = async (leadId: string, previewUrl: string) => {
    await navigator.clipboard.writeText(previewUrl)
    setCopiedId(leadId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleTextPreview = (lead: any) => {
    if (!lead.phone || !lead.previewUrl) return
    const message = encodeURIComponent(
      `Hey ${lead.firstName}, here's the preview of your new website for ${lead.companyName}: ${lead.previewUrl}`
    )
    window.open(`sms:${lead.phone}?body=${message}`)
  }

  const openEditDialog = (lead: any) => {
    setEditLeadId(lead.id)
    setEditForm({
      firstName: lead.firstName || '',
      lastName: lead.lastName || '',
      companyName: lead.companyName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      city: lead.city || '',
      state: lead.state || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editLeadId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setAssignedLeads(prev =>
          prev.map(l => l.id === editLeadId ? { ...l, ...editForm } : l)
        )
        setEditDialogOpen(false)
      }
    } catch (e) { console.error('Failed to save:', e) }
    finally { setSaving(false) }
  }

  if (loading || !repData) {
    return <div className="p-8 text-center">Loading your dashboard...</div>
  }

  const hotLeads = assignedLeads.filter(l => l.status === 'HOT_LEAD')
  const qualifiedLeads = assignedLeads.filter(l => l.status === 'QUALIFIED')
  const dialableLeads = assignedLeads.filter(l => ['NEW', 'HOT_LEAD', 'QUALIFIED'].includes(l.status))

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {repData.name}</h1>
          <p className="text-gray-500 mt-1">Your sales performance and assigned leads</p>
        </div>
        <Link href="/reps/dialer">
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Phone size={18} className="mr-2" />
            Start Dialing ({dialableLeads.length})
          </Button>
        </Link>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Assigned Leads</span>
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{assignedLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Hot Leads</span>
            <Target size={20} className="text-red-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{hotLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Qualified</span>
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{qualifiedLeads.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Potential Revenue</span>
            <DollarSign size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(assignedLeads.length * 149)}
          </div>
        </Card>
      </div>

      {/* Assigned Leads Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Your Assigned Leads ({assignedLeads.length})
          </h3>
        </div>

        {assignedLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No leads assigned yet</p>
            <p className="text-sm mt-1">Check back soon — leads are assigned by admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Location</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Industry</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</div>
                      {lead.email && <div className="text-sm text-gray-500">{lead.email}</div>}
                    </td>
                    <td className="p-4 text-gray-700">{lead.companyName}</td>
                    <td className="p-4">
                      <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline font-mono text-sm">
                        {lead.phone}
                      </a>
                    </td>
                    <td className="p-4 text-gray-700 text-sm">
                      {lead.city}{lead.city && lead.state ? ', ' : ''}{lead.state}
                    </td>
                    <td className="p-4">
                      {lead.industry && (
                        <Badge variant="outline" className="text-xs">
                          {lead.industry.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={
                        lead.status === 'HOT_LEAD' ? 'destructive' :
                        lead.status === 'QUALIFIED' ? 'default' :
                        'secondary'
                      }>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {lead.previewUrl && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                              onClick={() => handleTextPreview(lead)}
                              title="Text preview to prospect"
                            >
                              <MessageSquare size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyPreview(lead.id, lead.previewUrl)}
                              title="Copy preview link"
                            >
                              {copiedId === lead.id ? (
                                <CheckCircle size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600"
                              onClick={() => window.open(lead.previewUrl, '_blank')}
                              title="View preview"
                            >
                              <Eye size={14} />
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(lead)}
                          title="Edit lead info"
                        >
                          <Edit3 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Quick Links */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/reps/dialer">
            <Button variant="outline" className="w-full">
              <Phone size={18} className="mr-2" />
              Dialer
            </Button>
          </Link>
          <Link href="/reps/earnings">
            <Button variant="outline" className="w-full">
              <DollarSign size={18} className="mr-2" />
              Earnings
            </Button>
          </Link>
          <Link href="/reps/tasks">
            <Button variant="outline" className="w-full">
              <Target size={18} className="mr-2" />
              Tasks
            </Button>
          </Link>
        </div>
      </Card>

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
