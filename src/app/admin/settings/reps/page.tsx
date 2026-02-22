'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RepsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/settings?tab=team')
  }, [router])
  return null
}
