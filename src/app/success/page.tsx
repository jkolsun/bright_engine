import { Card } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center">
        <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you! We've received your payment. Our team will reach out within 24 hours
          to collect your business information and start building your website.
        </p>
        <p className="text-sm text-gray-500">
          Questions? Email us at admin@brightautomations.net
        </p>
      </Card>
    </div>
  )
}