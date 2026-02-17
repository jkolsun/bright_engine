'use client'

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
import { Plus, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function RepsPage() {
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'REP',
    portalType: 'FULL'
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setDialogOpen(false)
        setFormData({ name: '', email: '', phone: '', role: 'REP', portalType: 'FULL' })
        loadReps()
      } else {
        alert('Failed to create rep account')
      }
    } catch (error) {
      console.error('Error creating rep:', error)
      alert('Failed to create rep account')
    }
  }

  const toggleStatus = async (repId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    
    try {
      const res = await fetch(`/api/users/${repId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
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
      const res = await fetch(`/api/users/${repId}`, {
        method: 'DELETE'
      })

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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Reps</h1>
          <p className="text-gray-500 mt-1">Manage your sales team</p>
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
                <DialogDescription>
                  Add a new sales rep to your team
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Full Name *
                  </label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Sarah Johnson"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="sarah@company.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium">
                    Role
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="REP">Sales Rep</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                {formData.role === 'REP' && (
                  <div className="space-y-2">
                    <label htmlFor="portalType" className="text-sm font-medium">
                      Portal Type
                    </label>
                    <select
                      id="portalType"
                      value={formData.portalType}
                      onChange={(e) => setFormData(prev => ({ ...prev, portalType: e.target.value }))}
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
                <Button type="submit">
                  Create Rep
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Total Reps</div>
          <div className="text-3xl font-bold text-gray-900">{reps.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Active</div>
          <div className="text-3xl font-bold text-green-600">
            {reps.filter(r => r.status === 'ACTIVE').length}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600 mb-1">Inactive</div>
          <div className="text-3xl font-bold text-gray-400">
            {reps.filter(r => r.status === 'INACTIVE').length}
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
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Role</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{rep.name}</td>
                    <td className="p-4 text-gray-700">{rep.email}</td>
                    <td className="p-4 text-gray-700">{rep.phone || '-'}</td>
                    <td className="p-4">
                      <Badge variant={rep.role === 'ADMIN' ? 'default' : 'secondary'}>
                        {rep.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {rep.role === 'REP' ? (
                        <Badge variant={rep.portalType === 'PART_TIME' ? 'outline' : 'secondary'}>
                          {rep.portalType === 'PART_TIME' ? 'Part-Time' : 'Full-Time'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant={rep.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {rep.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(rep.id, rep.status)}
                      >
                        {rep.status === 'ACTIVE' ? <UserX size={16} /> : <UserCheck size={16} />}
                        {rep.status === 'ACTIVE' ? ' Deactivate' : ' Activate'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteRep(rep.id, rep.name)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
