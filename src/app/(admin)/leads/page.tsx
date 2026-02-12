import { prisma } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { formatPhone } from '@/lib/utils'

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      assignedTo: {
        select: { name: true }
      }
    }
  })

  const stats = {
    total: await prisma.lead.count(),
    hot: await prisma.lead.count({ where: { priority: 'HOT' } }),
    qualified: await prisma.lead.count({ where: { status: 'QUALIFIED' } }),
    building: await prisma.lead.count({ where: { status: 'BUILDING' } }),
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">{stats.total} total leads</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">Import CSV</Button>
          <Button>Add Lead</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats.total} />
        <StatCard label="Hot Leads" value={stats.hot} variant="danger" />
        <StatCard label="Qualified" value={stats.qualified} variant="success" />
        <StatCard label="Building" value={stats.building} variant="warning" />
      </div>

      {/* Leads Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {lead.firstName} {lead.lastName}
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
                      {lead.city}, {lead.state}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={lead.status} />
                    {lead.priority === 'HOT' && (
                      <Badge variant="destructive" className="ml-2">HOT</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lead.assignedTo?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link href={`/admin/leads/${lead.id}`}>
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
  value: number
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

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    NEW: 'outline',
    HOT_LEAD: 'destructive',
    QUALIFIED: 'info',
    INFO_COLLECTED: 'info',
    BUILDING: 'warning',
    QA: 'warning',
    CLIENT_REVIEW: 'warning',
    APPROVED: 'success',
    PAID: 'success',
    CLOSED_LOST: 'outline',
  }

  return (
    <Badge variant={variants[status] || 'default'}>
      {status.replace('_', ' ')}
    </Badge>
  )
}
