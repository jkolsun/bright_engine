import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      lead: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          city: true,
          state: true
        }
      },
      analytics: true
    }
  })

  const stats = {
    total: await prisma.client.count(),
    active: await prisma.client.count({ where: { hostingStatus: 'ACTIVE' } }),
    cancelled: await prisma.client.count({ where: { hostingStatus: 'CANCELLED' } }),
    failed: await prisma.client.count({ where: { hostingStatus: 'FAILED_PAYMENT' } })
  }

  // Calculate total MRR
  const activeClients = await prisma.client.findMany({
    where: { hostingStatus: 'ACTIVE' },
    select: { monthlyRevenue: true }
  })

  const totalMRR = activeClients.reduce((sum, client) => sum + client.monthlyRevenue, 0)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{stats.total} total clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats.total} />
        <StatCard label="Active" value={stats.active} variant="success" />
        <StatCard label="Total MRR" value={formatCurrency(totalMRR)} variant="success" />
        <StatCard label="At Risk" value={stats.failed} variant="danger" />
      </div>

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
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MRR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analytics
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.companyName}</div>
                    <div className="text-sm text-gray-500">{client.industry}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {client.lead.firstName} {client.lead.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{client.lead.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.siteUrl ? (
                      <a 
                        href={client.siteUrl} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        View Site
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">No site yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <HostingStatusBadge status={client.hostingStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(client.monthlyRevenue)}/mo
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.analytics ? (
                      <div className="text-sm text-gray-600">
                        <div>{client.analytics.totalVisits} visits</div>
                        <div>{client.analytics.totalForms} leads</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No data</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string
  value: string | number
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const colors = {
    default: 'bg-gray-50 text-gray-900',
    success: 'bg-green-50 text-green-900',
    warning: 'bg-yellow-50 text-yellow-900',
    danger: 'bg-red-50 text-red-900',
  }

  return (
    <div className={`rounded-lg border p-4 ${colors[variant]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-1">{label}</div>
    </div>
  )
}

function HostingStatusBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    ACTIVE: 'success',
    CANCELLED: 'outline',
    FAILED_PAYMENT: 'destructive',
    GRACE_PERIOD: 'warning',
  }

  return (
    <Badge variant={variants[status] || 'default'}>
      {status.replace('_', ' ')}
    </Badge>
  )
}
