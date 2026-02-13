import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, PhoneOff } from 'lucide-react'

export default function DialerPage() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Power Dialer</h1>
        <p className="text-gray-500 mt-1">Call leads and track conversations</p>
      </div>

      <Card className="p-12">
        <div className="max-w-md mx-auto space-y-6 text-center">
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Phone size={48} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Power Dialer</h2>
            <p className="text-gray-600 mt-2">
              The dialer feature is not yet configured. Contact your administrator to set up phone integration.
            </p>
          </div>
          <p className="text-sm text-gray-500">
            Once configured, you'll be able to make calls directly from this platform with automatic call logging and lead updates.
          </p>
        </div>
      </Card>
    </div>
  )
}
