'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Link from 'next/link'
import { formatPhone } from '@/lib/utils'
import { useState } from 'react'
import { Search, Filter, Download, Plus, Eye, MessageSquare, Phone as PhoneIcon, TrendingUp } from 'lucide-react'

// Comprehensive mock leads data
const MOCK_LEADS = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Smith',
    phone: '5551234567',
    email: 'john@abcroofing.com',
    companyName: 'ABC Roofing',
    city: 'Dallas',
    state: 'TX',
    status: 'HOT_LEAD',
    priority: 'HOT',
    source: 'Google Ads',
    assignedTo: { name: 'Sarah Johnson' },
    createdAt: new Date('2026-02-11'),
    lastActivity: new Date(Date.now() - 5 * 60 * 1000),
    previewViews: 8,
    previewClicks: 3,
    messagesCount: 12,
    engagement: 95,
    estimatedValue: 299
  },
  {
    id: 2,
    firstName: 'Mike',
    lastName: 'Johnson',
    phone: '5559876543',
    email: 'mike@eliteplumbing.com',
    companyName: 'Elite Plumbing',
    city: 'Austin',
    state: 'TX',
    status: 'QUALIFIED',
    priority: 'HIGH',
    source: 'Facebook',
    assignedTo: { name: 'Andrew Tesauro' },
    createdAt: new Date('2026-02-10'),
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    previewViews: 5,
    previewClicks: 2,
    messagesCount: 8,
    engagement: 78,
    estimatedValue: 299
  },
  {
    id: 3,
    firstName: 'Sarah',
    lastName: 'Davis',
    phone: '5554567890',
    email: 'sarah@propainting.com',
    companyName: 'Pro Painting',
    city: 'Houston',
    state: 'TX',
    status: 'BUILDING',
    priority: 'NORMAL',
    source: 'Referral',
    assignedTo: { name: 'Jared Kolsun' },
    createdAt: new Date('2026-02-09'),
    lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000),
    previewViews: 12,
    previewClicks: 5,
    messagesCount: 15,
    engagement: 85,
    estimatedValue: 299
  },
  {
    id: 4,
    firstName: 'Tom',
    lastName: 'Wilson',
    phone: '5552223333',
    email: 'tom@quickhvac.com',
    companyName: 'Quick HVAC',
    city: 'San Antonio',
    state: 'TX',
    status: 'CLIENT_REVIEW',
    priority: 'NORMAL',
    source: 'Google Ads',
    assignedTo: { name: 'Sarah Johnson' },
    createdAt: new Date('2026-02-01'),
    lastActivity: new Date(Date.now() - 8 * 60 * 60 * 1000),
    previewViews: 18,
    previewClicks: 7,
    messagesCount: 22,
    engagement: 92,
    estimatedValue: 299
  },
  {
    id: 5,
    firstName: 'Lisa',
    lastName: 'Brown',
    phone: '5557778888',
    email: 'lisa@cleanteam.com',
    companyName: 'Clean Team',
    city: 'Fort Worth',
    state: 'TX',
    status: 'NEW',
    priority: 'NORMAL',
    source: 'Website',
    assignedTo: null,
    createdAt: new Date('2026-02-12'),
    lastActivity: new Date(Date.now() - 30 * 60 * 1000),
    previewViews: 2,
    previewClicks: 1,
    messagesCount: 3,
    engagement: 45,
    estimatedValue: 299
  },
  {
    id: 6,
    firstName: 'David',
    lastName: 'Martinez',
    phone: '5553334444',
    email: 'david@peaklandscaping.com',
    companyName: 'Peak Landscaping',
    city: 'Plano',
    state: 'TX',
    status: 'PAID',
    priority: 'NORMAL',
    source: 'Google Ads',
    assignedTo: { name: 'Andrew Tesauro' },
    createdAt: new Date('2026-01-15'),
    lastActivity: new Date('2026-02-10'),
    previewViews: 25,
    previewClicks: 12,
    messagesCount: 35,
    engagement: 98,
    estimatedValue: 299
  }
]

const MOCK_STATS = {
  total: 156,
  hot: 12,
  qualified: 23,
  building: 8,
  new: 18,
  avgEngagement: 82
}

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredLeads = MOCK_LEADS.filter(lead => {
    const matchesSearch = 
      lead.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{MOCK_STATS.total} total leads • {MOCK_STATS.avgEngagement}% avg engagement</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download size={18} className="mr-2" />
            Export CSV
          </Button>
          <Link href="/admin/import">
            <Button variant="outline">
              <Filter size={18} className="mr-2" />
              Import Leads
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Manually add a new lead to your pipeline.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      First Name *
                    </label>
                    <Input id="firstName" placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      Last Name *
                    </label>
                    <Input id="lastName" placeholder="Smith" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium">
                    Company Name *
                  </label>
                  <Input id="company" placeholder="ABC Roofing" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone *
                  </label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input id="email" type="email" placeholder="john@abcroofing.com" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="city" className="text-sm font-medium">
                      City
                    </label>
                    <Input id="city" placeholder="Dallas" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="state" className="text-sm font-medium">
                      State
                    </label>
                    <Input id="state" placeholder="TX" maxLength={2} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit">
                  Create Lead
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <StatCard label="Total Leads" value={MOCK_STATS.total} variant="default" onClick={() => setStatusFilter('all')} active={statusFilter === 'all'} />
        <StatCard label="New" value={MOCK_STATS.new} variant="default" onClick={() => setStatusFilter('NEW')} active={statusFilter === 'NEW'} />
        <StatCard label="Hot Leads" value={MOCK_STATS.hot} variant="danger" onClick={() => setStatusFilter('HOT_LEAD')} active={statusFilter === 'HOT_LEAD'} />
        <StatCard label="Qualified" value={MOCK_STATS.qualified} variant="success" onClick={() => setStatusFilter('QUALIFIED')} active={statusFilter === 'QUALIFIED'} />
        <StatCard label="Building" value={MOCK_STATS.building} variant="warning" onClick={() => setStatusFilter('BUILDING')} active={statusFilter === 'BUILDING'} />
        <StatCard label="Closed" value={45} variant="success" onClick={() => setStatusFilter('PAID')} active={statusFilter === 'PAID'} />
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search leads by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="NEW">New</option>
            <option value="HOT_LEAD">Hot Lead</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="BUILDING">Building</option>
            <option value="CLIENT_REVIEW">Review</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {lead.firstName} {lead.lastName}
                        </span>
                        {lead.priority === 'HOT' && (
                          <TrendingUp size={14} className="text-red-600" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{formatPhone(lead.phone)}</div>
                      {lead.email && (
                        <div className="text-sm text-gray-500">{lead.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{lead.companyName}</div>
                    <div className="text-sm text-gray-500">
                      {lead.city}, {lead.state} • {lead.source}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Eye size={14} />
                        <span>{lead.previewViews}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MessageSquare size={14} />
                        <span>{lead.messagesCount}</span>
                      </div>
                      <div className="w-16">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">{lead.engagement}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              lead.engagement >= 80 ? 'bg-green-500' :
                              lead.engagement >= 60 ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${lead.engagement}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimeAgo(lead.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.assignedTo?.name || (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ${lead.estimatedValue}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/leads/${lead.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No leads found matching your filters</p>
        </div>
      )}
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  variant = 'default',
  onClick,
  active = false
}: { 
  label: string
  value: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  onClick?: () => void
  active?: boolean
}) {
  const colors = {
    default: active ? 'bg-gray-100 text-gray-900 border-gray-300' : 'bg-gray-50 text-gray-900 border-gray-200',
    success: active ? 'bg-green-100 text-green-900 border-green-300' : 'bg-green-50 text-green-900 border-green-200',
    warning: active ? 'bg-yellow-100 text-yellow-900 border-yellow-300' : 'bg-yellow-50 text-yellow-900 border-yellow-200',
    danger: active ? 'bg-red-100 text-red-900 border-red-300' : 'bg-red-50 text-red-900 border-red-200',
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-4 hover:shadow-md transition-all text-left w-full ${colors[variant]}`}
    >
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: any }> = {
    NEW: { label: 'New', variant: 'outline' },
    HOT_LEAD: { label: 'Hot Lead', variant: 'destructive' },
    QUALIFIED: { label: 'Qualified', variant: 'info' },
    INFO_COLLECTED: { label: 'Info Collected', variant: 'info' },
    BUILDING: { label: 'Building', variant: 'warning' },
    QA: { label: 'QA', variant: 'warning' },
    CLIENT_REVIEW: { label: 'Review', variant: 'warning' },
    APPROVED: { label: 'Approved', variant: 'success' },
    PAID: { label: 'Paid', variant: 'success' },
    CLOSED_LOST: { label: 'Lost', variant: 'outline' },
  }

  const { label, variant } = config[status] || { label: status, variant: 'default' }

  return <Badge variant={variant}>{label}</Badge>
}

function formatTimeAgo(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}
