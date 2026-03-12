'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { getDaysSince } from '../_lib/utils'

// ─── Props ───
interface ClientBillingProps {
  client: any
  daysActive: number | null
}

export default function ClientBilling({ client, daysActive }: ClientBillingProps) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Billing</h3>
      <div className="space-y-3 text-sm">
        {[
          { l: 'Plan', v: `${client.plan || 'base'} - ${formatCurrency(client.monthlyRevenue)}/mo` },
          { l: 'Stripe Customer', v: client.stripeCustomerId || 'Not linked', c: client.stripeCustomerId ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500' },
          { l: 'Subscription', v: client.stripeSubscriptionId || 'Not linked', c: client.stripeSubscriptionId ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500' },
        ].map(row => (
          <div key={row.l} className="flex justify-between py-2 border-b dark:border-slate-700">
            <span className="text-gray-500 dark:text-gray-400">{row.l}</span>
            <span className={`font-medium ${row.c || ''}`}>{row.v}</span>
          </div>
        ))}
        <div className="flex justify-between py-2 border-b dark:border-slate-700">
          <span className="text-gray-500 dark:text-gray-400">Status</span>
          <Badge variant={client.hostingStatus === 'ACTIVE' ? 'default' : 'destructive'}>{client.hostingStatus}</Badge>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-gray-500 dark:text-gray-400">Est. LTV</span>
          <span className="font-medium">{daysActive !== null ? formatCurrency(Math.round((client.monthlyRevenue || 0) * (daysActive / 30))) : '—'}</span>
        </div>
      </div>
    </Card>
  )
}
