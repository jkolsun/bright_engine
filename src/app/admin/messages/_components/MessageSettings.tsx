'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface MessageSettingsProps {
  onBack: () => void
}

export default function MessageSettings({ onBack }: MessageSettingsProps) {
  return (
    <div className="p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
        <ArrowLeft size={16} /> Back to Messages
      </button>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Message Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configure message preferences</p>
      </div>

      <Card className="p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Message settings coming soon.</p>
      </Card>
    </div>
  )
}
