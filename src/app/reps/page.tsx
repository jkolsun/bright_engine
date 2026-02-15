'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { Phone, Target, TrendingUp, DollarSign, Users, Award, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function RepsPage() {
  const [repData, setRepData] = useState<any>(null)
  const [assignedLeads, setAssignedLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRepData()
  }, [])

  const loadRepData = async () => {
    try {
      // Get currently logged-in user from session
      const meRes = await fetch('/api/auth/me')
      
      if (!meRes.ok) {
        console.error('Not authenticated')
        setLoading(false)
        return
      }

      const meData = await meRes.json()
      const currentUser = meData.user
      setRepData(currentUser)

      // Get leads assigned to current user (server-side filtering)
      const leadsRes = await fetch(`/api/leads?assignedTo=${currentUser.id}&limit=200`)
      if (leadsRes.ok) {
        const data = await leadsRes.json()
        setAssignedLeads(data.leads || [])
      }

      // Get commission data (optional)
      const commRes = await fetch('/api/commissions?status=PENDING')
      // Commission data can be used if needed
    } catch (error) {
      console.error('Failed to load rep data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !repData) {
    return <div className="p-8 text-center">Loading your dashboard...</div>
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {repData.name}</h1>
        <p className="text-gray-500 mt-1">Your sales performance and assigned leads</p>
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
          <div className="text-3xl font-bold text-gray-900">
            {assignedLeads.filter(l => l.status === 'HOT_LEAD').length}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Qualified</span>
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {assignedLeads.filter(l => l.status === 'QUALIFIED').length}
          </div>
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

      {/* Assigned Leads */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Assigned Leads</h3>
          <Button variant="outline" size="sm">
            View All Leads
          </Button>
        </div>

        {assignedLeads.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No leads assigned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Name</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Company</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Phone</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-700">Value</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assignedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-900">{lead.firstName} {lead.lastName}</td>
                    <td className="p-4 text-gray-700">{lead.companyName}</td>
                    <td className="p-4 text-gray-700">{lead.phone}</td>
                    <td className="p-4">
                      <Badge variant={lead.status === 'HOT_LEAD' ? 'destructive' : 'default'}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-gray-700">$149</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `/reps/dialer?leadId=${lead.id}`}
                      >
                        Details
                      </Button>
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
        </div>
      </Card>
    </div>
  )
}
