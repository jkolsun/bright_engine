import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

// Mock clients data
const MOCK_CLIENTS = [
  {
    id: 1,
    companyName: 'ABC Roofing',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 39,
    totalRevenue: 897,
    websiteUrl: 'abcroofing.com',
    createdAt: new Date('2025-06-15'),
    upsells: [{ name: 'SEO Package', price: 99 }]
  },
  {
    id: 2,
    companyName: 'Elite Plumbing',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 39,
    totalRevenue: 1245,
    websiteUrl: 'eliteplumbing.com',
    createdAt: new Date('2025-05-01'),
    upsells: []
  },
  {
    id: 3,
    companyName: 'Pro Painting',
    hostingStatus: 'ACTIVE',
    monthlyRevenue: 138,
    totalRevenue: 552,
    websiteUrl: 'propainting.com',
    createdAt: new Date('2025-09-10'),
    upsells: [
      { name: 'SEO Package', price: 99 },
    ]
  },
  {
    id: 4,
    companyName: 'Quick HVAC',
    hostingStatus: 'PAUSED',
    monthlyRevenue: 0,
    totalRevenue: 675,
    websiteUrl: 'quickhvac.com',
    createdAt: new Date('2025-03-20'),
    upsells: []
  }
]

const MOCK_STATS = {
  total: 45,
  active: 42,
  paused: 3,
  totalMRR: 2088
}

export default function ClientsPage() {
  const clients = MOCK_CLIENTS
  const stats = MOCK_STATS

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">{stats.total} total clients</p>
        </div>
        <Button>Add Client</Button>
      </div>

      {/* UI Preview Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>UI Preview Mode</strong> - Showing sample clients. Connect to database for real data.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Total Clients" value={stats.total} />
        <StatCard label="Active" value={stats.active} variant="success" />
        <StatCard label="Paused" value={stats.paused} variant="warning" />
        <StatCard label="Total MRR" value={formatCurrency(stats.totalMRR)} variant="primary" />
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
                  Client Since
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {client.companyName}
                      </div>
                      <div className="text-sm text-gray-500">{client.websiteUrl}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={client.hostingStatus === 'ACTIVE' ? 'success' : 'warning'}>
                      {client.hostingStatus}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(client.monthlyRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(client.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.upsells.length > 0 ? (
                      <div className="space-y-1">
                        {client.upsells.map((upsell: any, idx: number) => (
                          <div key={idx}>
                            {upsell.name} ({formatCurrency(upsell.price)})
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(client.createdAt).toLocaleDateString()}
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
  variant?: 'default' | 'success' | 'warning' | 'primary'
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
    </div>
  )
}
