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
import { Plus, UserCheck, UserX, KeyRound, Eye, EyeOff, Copy, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function RepsPage() {
  const [reps, setReps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'REP',
    portalType: 'FULL'
  })

  // Credentials state
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<any>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({})

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
        body: JSON.stringify({ ...formData, password })
      })

      if (res.ok) {
        setDialogOpen(false)
        // Show the credentials so admin can share them
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
        body: JSON.stringify({ password: newPassword })
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const repUsers = reps.filter(r => r.role === 'REP')

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
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Leave blank to auto-generate"
                    />
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}>
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">If blank, a random password will be generated and shown after creation.</p>
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
                          <span className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded">{visiblePasswords[rep.id]}</span>
                          <button onClick={() => copyToClipboard(visiblePasswords[rep.id])} className="text-gray-400 hover:text-gray-600">
                            <Copy size={14} />
                          </button>
                          <button onClick={() => setVisiblePasswords(prev => { const n = { ...prev }; delete n[rep.id]; return n })} className="text-gray-400 hover:text-gray-600">
                            <EyeOff size={14} />
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
      <Dialog open={resetDialogOpen} onOpenChange={(open) => { setResetDialogOpen(open); if (!open) setResetResult(null) }}>
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
                <Button onClick={() => {
                  // Store the new password so admin can see it in the credentials table
                  if (resetTarget) {
                    setVisiblePasswords(prev => ({ ...prev, [resetTarget.id]: resetResult }))
                  }
                  setResetDialogOpen(false)
                  setResetResult(null)
                }}>
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
                  <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setResetPassword(generatePassword())}>
                    Generate
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPassword} disabled={resetting}>
                  {resetting ? 'Resetting...' : 'Reset Password'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
