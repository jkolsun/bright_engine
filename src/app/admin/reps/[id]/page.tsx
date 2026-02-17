'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, Target, DollarSign, TrendingUp,
  CheckCircle, Clock, AlertCircle, User
} from 'lucide-react'

interface RepDetailPageProps {
  params: { id: string }
}

export default function RepDetailPage({ params }: RepDetailPageProps) {
  const [rep, setRep] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRep = async () => {
      try {
        const res = await fetch(`/api/users/${params.id}`)
        if (!res.ok) throw new Error('Failed to fetch rep')
        const data = await res.json()
        setRep(data.user)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rep')
      } finally {
        setLoading(false)
      }
    }
    fetchRep()
  }, [params.id])

  if (loading) {
    return <div className="p-8 text-center text-gray-600">Loading rep details...</div>
  }

  if (error || !rep) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Rep not found'}</p>
        <Link href="/admin/reps/performance" className="text-blue-600 hover:text-blue-800">
          Back to Rep Performance
        </Link>
      </div>
    )
  }

  const leads = rep.assignedLeads || []
  const commissions = rep.commissions || []
  const tasks = rep.repTasks || []

  const closedDeals = leads.filter((l: any) => l.status === 'PAID').length
  const hotLeads = leads.filter((l: any) => l.priority === 'HOT').length
  const totalCommission = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
  const pendingCommission = commissions
    .filter((c: any) => c.status === 'PENDING')
    .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
  const pendingTasks = tasks.filter((t: any) => t.status === 'PENDING').length

  const statusColor: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/reps/performance" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} />
          Back to Rep Performance
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={32} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{rep.name}</h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1 text-sm text-gray-600">
                  <Mail size={14} /> {rep.email}
                </span>
                {rep.phone && (
                  <span className="flex items-center gap-1 text-sm text-gray-600">
                    <Phone size={14} /> {rep.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Badge className={statusColor[rep.status] || 'bg-gray-100 text-gray-800'}>
            {rep.status}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Assigned Leads</span>
            <Target size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Hot Leads</span>
            <AlertCircle size={18} className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{hotLeads}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Closed Deals</span>
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{closedDeals}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Total Commission</span>
            <DollarSign size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCommission)}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Pending Tasks</span>
            <Clock size={18} className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{pendingTasks}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Leads */}
        <Card>
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Assigned Leads ({leads.length})</h3>
          </div>
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No leads assigned</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {leads.map((lead: any) => (
                <Link key={lead.id} href={`/admin/leads/${lead.id}`} className="block p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</p>
                      <p className="text-sm text-gray-600">{lead.companyName} - {lead.city}, {lead.state}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.priority === 'HOT' && <Badge variant="destructive">HOT</Badge>}
                      <LeadStatusBadge status={lead.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Tasks */}
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Recent Tasks ({tasks.length})</h3>
          </div>
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No tasks yet</div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {tasks.map((task: any) => (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{task.taskType.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-gray-600">
                        {task.lead ? `${task.lead.firstName} ${task.lead.lastName} at ${task.lead.companyName}` : 'Unknown lead'}
                      </p>
                    </div>
                    <TaskStatusBadge status={task.status} />
                  </div>
                  {task.notes && <p className="text-sm text-gray-500 mt-1">{task.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Commissions */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Commission History</h3>
          {pendingCommission > 0 && (
            <Badge variant="outline">{formatCurrency(pendingCommission)} pending</Badge>
          )}
        </div>
        {commissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No commissions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Date</th>
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Type</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Amount</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-700">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="p-3 text-sm text-gray-700">{c.type}</td>
                    <td className="p-3 text-sm text-right font-semibold text-gray-900">{formatCurrency(c.amount)}</td>
                    <td className="p-3 text-right">
                      <CommissionStatusBadge status={c.status} />
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

function LeadStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    NEW: 'bg-gray-100 text-gray-800',
    QUALIFIED: 'bg-blue-100 text-blue-800',
    HOT_LEAD: 'bg-red-100 text-red-800',
    BUILDING: 'bg-purple-100 text-purple-800',
    PAID: 'bg-green-100 text-green-800',
    CLOSED_LOST: 'bg-gray-100 text-gray-500',
  }
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status.replace(/_/g, ' ')}</Badge>
}

function TaskStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>
}

function CommissionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    PAID: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }
  return <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>
}
