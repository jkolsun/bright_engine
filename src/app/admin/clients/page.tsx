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
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import { Search, Filter, Download, Plus, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'

// Rich mock clients data
const MOCK_CLIENTS = [
  {
    id: 1,
    companyName: 'ABC Roofing',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 138,
    totalRevenue: 2376,
    websiteUrl: 'abcroofing.com',
    createdAt: new Date('2025-06-15'),
    upsells: [
      { name: 'SEO Package', price: 99 }
    ],
    churnRisk: 'low',
    lastPayment: new Date('2026-02-01'),
    nextPayment: new Date('2026-03-01'),
    contractLength: 12,
    monthsRemaining: 6,
    revenueGrowth: 15
  },
  {
    id: 2,
    companyName: 'Elite Plumbing',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 39,
    totalRevenue: 1638,
    websiteUrl: 'eliteplumbing.com',
    createdAt: new Date('2025-05-01'),
    upsells: [],
    churnRisk: 'medium',
    lastPayment: new Date('2026-02-05'),
    nextPayment: new Date('2026-03-05'),
    contractLength: 12,
    monthsRemaining: 3,
    revenueGrowth: 0
  },
  {
    id: 3,
    companyName: 'Pro Painting',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 138,
    totalRevenue: 828,
    websiteUrl: 'propainting.com',
    createdAt: new Date('2025-09-10'),
    upsells: [
      { name: 'SEO Package', price: 99 }
    ],
    churnRisk: 'low',
    lastPayment: new Date('2026-02-10'),
    nextPayment: new Date('2026-03-10'),
    contractLength: 12,
    monthsRemaining: 8,
    revenueGrowth: 23
  },
  {
    id: 4,
    companyName: 'Quick HVAC',
    hostingStatus: 'PAUSED',
    monthlyRevenue: 0,
    totalRevenue: 975,
    websiteUrl: 'quickhvac.com',
    createdAt: new Date('2025-03-20'),
    upsells: [],
    churnRisk: 'high',
    lastPayment: new Date('2025-12-20'),
    nextPayment: null,
    contractLength: 12,
    monthsRemaining: 0,
    revenueGrowth: -100
  },
  {
    id: 5,
    companyName: 'Peak Landscaping',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 237,
    totalRevenue: 4977,
    websiteUrl: 'peaklandscaping.com',
    createdAt: new Date('2024-07-01'),
    upsells: [
      { name: 'SEO Package', price: 99 },
      { name: 'Premium Maintenance', price: 99 }
    ],
    churnRisk: 'low',
    lastPayment: new Date('2026-02-01'),
    nextPayment: new Date('2026-03-01'),
    contractLength: 24,
    monthsRemaining: 4,
    revenueGrowth: 42
  }
]

const MOCK_STATS = {
  total: 45,
  active: 42,
  paused: 3,
  totalMRR: 5544,
  avgRevenuePerClient: 132,
  churnRate: 2.4,
  upsellRate: 35
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredClients = MOCK_CLIENTS.filter(client => {
    const matchesSearch = 
      client.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.websiteUrl.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'ACTIVE' && client.hostingStatus === 'ACTIVE') ||
      (statusFilter === 'PAUSED' && client.hostingStatus === 'PAUSED')

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">
            {MOCK_STATS.total} total clients • {formatCurrency(MOCK_STATS.totalMRR)} MRR
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download size={18} className="mr-2" />
            Export
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus size={18} className="mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Convert a lead to a paying client. Fill in the details below.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="company" className="text-sm font-medium">
                    Company Name *
                  </label>
                  <Input
                    id="company"
                    placeholder="ABC Roofing"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="website" className="text-sm font-medium">
                    Website URL *
                  </label>
                  <Input
                    id="website"
                    placeholder="abcroofing.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="package" className="text-sm font-medium">
                    Package
                  </label>
                  <select 
                    id="package"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="basic">Basic - $39/mo</option>
                    <option value="premium">Premium - $138/mo</option>
                    <option value="enterprise">Enterprise - $237/mo</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="setup" className="rounded" />
                  <label htmlFor="setup" className="text-sm">
                    Charge $149 setup fee
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit">
                  Create Client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          label="Total MRR" 
          value={formatCurrency(MOCK_STATS.totalMRR)} 
          variant="primary"
          trend="+12.5%"
        />
        <StatCard 
          label="Active Clients" 
          value={MOCK_STATS.active} 
          variant="success"
          subtitle={`${MOCK_STATS.paused} paused`}
        />
        <StatCard 
          label="Avg Rev/Client" 
          value={formatCurrency(MOCK_STATS.avgRevenuePerClient)} 
          variant="default"
          trend="+8%"
        />
        <StatCard 
          label="Upsell Rate" 
          value={`${MOCK_STATS.upsellRate}%`} 
          variant="success"
          subtitle={`${MOCK_STATS.churnRate}% churn`}
        />
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              placeholder="Search clients by company name or website..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
      </Card>

      {/* Clients Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upsells
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        {client.companyName}
                        <a 
                          href={`https://${client.websiteUrl}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                      <div className="text-sm text-gray-500">{client.websiteUrl}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={client.hostingStatus === 'ACTIVE' ? 'success' : 'warning'}>
                      {client.hostingStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(client.monthlyRevenue)}
                      </div>
                      {client.revenueGrowth !== 0 && (
                        <div className={`text-xs flex items-center gap-1 ${
                          client.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {client.revenueGrowth > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {Math.abs(client.revenueGrowth)}%
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(client.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.upsells.length > 0 ? (
                      <div className="space-y-1">
                        {client.upsells.map((upsell: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            {upsell.name}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.monthsRemaining > 0 ? (
                      <div>
                        <div>{client.monthsRemaining} months left</div>
                        <div className="text-xs text-gray-400">{client.contractLength} month contract</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Expired</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant={
                        client.churnRisk === 'low' ? 'success' :
                        client.churnRisk === 'medium' ? 'warning' : 'destructive'
                      }
                    >
                      {client.churnRisk.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upsell Opportunities */}
      <Card className="p-6 bg-purple-50 border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Upsell Opportunities</h3>
        <p className="text-sm text-gray-700 mb-4">
          {MOCK_CLIENTS.filter(c => c.upsells.length === 0 && c.hostingStatus === 'ACTIVE').length} clients 
          without upsells • Potential revenue: {formatCurrency(
            MOCK_CLIENTS.filter(c => c.upsells.length === 0 && c.hostingStatus === 'ACTIVE').length * 99
          )}/month
        </p>
        <Button variant="outline">View Opportunities</Button>
      </Card>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  variant = 'default',
  trend,
  subtitle
}: { 
  label: string
  value: string | number
  variant?: 'default' | 'success' | 'warning' | 'primary'
  trend?: string
  subtitle?: string
}) {
  const colors = {
    default: 'bg-gray-50 text-gray-900 border-gray-200',
    success: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
    primary: 'bg-blue-50 text-blue-900 border-blue-200',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[variant]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
      {(trend || subtitle) && (
        <div className="text-xs mt-2 flex items-center gap-2">
          {trend && <span className="text-green-700 font-medium">{trend}</span>}
          {subtitle && <span className="text-gray-600">{subtitle}</span>}
        </div>
      )}
    </div>
  )
}
