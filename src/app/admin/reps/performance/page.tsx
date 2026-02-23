'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { TrendingUp, Users, Target, DollarSign, Award } from 'lucide-react'
import Link from 'next/link'

export default function RepPerformancePage() {
  const [reps, setReps] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [allLeads, setAllLeads] = useState<any[]>([])
  const [allCommissions, setAllCommissions] = useState<any[]>([])

  useEffect(() => {
    loadRepPerformance()
  }, [])

  const loadRepPerformance = async () => {
    try {
      const [repsRes, leadsRes, commRes] = await Promise.all([
        fetch('/api/users?role=REP&portalType=FULL'),
        fetch('/api/leads?limit=500'),
        fetch('/api/commissions')
      ])

      const repsData = repsRes.ok ? await repsRes.json() : { users: [] }
      const leadsData = leadsRes.ok ? await leadsRes.json() : { leads: [] }
      const commData = commRes.ok ? await commRes.json() : { commissions: [] }

      setReps(repsData.users || [])
      setAllLeads(leadsData.leads || [])
      setAllCommissions(commData.commissions || [])
    } catch (error) {
      console.error('Failed to load:', error)
    } finally { setLoading(false) }
  }

  // Calculate rep stats
  const repStats = (rep: any) => {
    const assigned = allLeads.filter((l: any) => (l.ownerRepId || l.assignedToId) === rep.id)
    const closed = assigned.filter((l: any) => l.status === 'PAID')
    const hot = assigned.filter((l: any) => l.status === 'HOT_LEAD')
    const revenue = closed.length * 149
    const commission = allCommissions
      .filter((c: any) => c.repId === rep.id && c.status !== 'REJECTED')
      .reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
    return { assignedLeads: assigned.length, hotLeads: hot.length, closedDeals: closed.length, totalRevenue: revenue, commission }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading rep performance...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rep Performance</h1>
          <p className="text-gray-500 mt-1">Monitor team metrics and earnings</p>
        </div>
        <Link href="/admin/settings/reps">
          <Button>
            <Users size={18} className="mr-2" />
            Manage Reps
          </Button>
        </Link>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Reps</span>
            <Users size={20} className="text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">{reps.length}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Active</span>
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {reps.filter(r => r.status === 'ACTIVE').length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Assigned Leads</span>
            <Target size={20} className="text-purple-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
          <p className="text-xs text-gray-500 mt-1">Across all reps</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Earnings</span>
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">$0</div>
          <p className="text-xs text-gray-500 mt-1">YTD commissions</p>
        </Card>
      </div>

      {/* Reps Table */}
      <Card>
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Your Sales Team</h3>
        </div>
        {reps.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No reps yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Rep Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Email</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Assigned Leads</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Hot Leads</th>
                  <th className="text-center p-4 text-sm font-semibold text-gray-700">Closed Deals</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Commission</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reps.map((rep) => {
                  const stats = repStats(rep)
                  return (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{rep.name}</td>
                      <td className="p-4 text-gray-700">{rep.email}</td>
                      <td className="p-4 text-center text-gray-700">{stats.assignedLeads}</td>
                      <td className="p-4 text-center text-gray-700">{stats.hotLeads}</td>
                      <td className="p-4 text-center text-gray-700">{stats.closedDeals}</td>
                      <td className="p-4 text-right font-semibold text-gray-900">{formatCurrency(stats.commission)}</td>
                      <td className="p-4 text-right">
                        <Link href={`/admin/reps/${rep.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
