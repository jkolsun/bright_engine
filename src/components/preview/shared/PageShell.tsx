'use client'

import type { ReactNode } from 'react'
import type { PageName } from './usePageRouter'

interface PageShellProps {
  page: PageName
  currentPage: PageName
  children: ReactNode
  className?: string
}

export default function PageShell({ page, currentPage, children, className = '' }: PageShellProps) {
  const isActive = page === currentPage

  return (
    <div
      data-page={page}
      className={className}
      style={{
        display: isActive ? 'block' : 'none',
        animation: isActive ? 'pageIn 0.3s ease-out' : undefined,
      }}
    >
      {children}
    </div>
  )
}
