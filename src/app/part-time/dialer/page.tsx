'use client'

import { Suspense } from 'react'
import DialerCore from '@/components/rep/DialerCore'

export default function PartTimeDialerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading dialer...</div>}>
      <DialerCore portalType="PART_TIME" basePath="/part-time" />
    </Suspense>
  )
}
