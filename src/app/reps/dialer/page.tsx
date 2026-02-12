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

      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto">
            <Phone size={48} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dialer Feature</h2>
            <p className="text-gray-600 mt-2">
              Power dialer integration coming soon. Make calls directly from the platform with automatic logging and follow-up scheduling.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button>
              <Phone size={18} className="mr-2" />
              Start Calling
            </Button>
            <Button variant="outline">
              <PhoneOff size={18} className="mr-2" />
              View Call Log
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
