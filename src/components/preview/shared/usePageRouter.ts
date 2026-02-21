'use client'

import { useState, useEffect, useCallback } from 'react'

export type PageName = 'home' | 'services' | 'about' | 'portfolio' | 'contact'

const VALID_PAGES: PageName[] = ['home', 'services', 'about', 'portfolio', 'contact']

function getPageFromHash(): PageName {
  if (typeof window === 'undefined') return 'home'
  const hash = window.location.hash.replace('#', '')
  return VALID_PAGES.includes(hash as PageName) ? (hash as PageName) : 'home'
}

export default function usePageRouter() {
  const [currentPage, setCurrentPage] = useState<PageName>('home')

  useEffect(() => {
    setCurrentPage(getPageFromHash())

    const handleHashChange = () => {
      const page = getPageFromHash()
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigateTo = useCallback((page: PageName) => {
    window.location.hash = page === 'home' ? '' : page
    if (page === 'home') {
      // Setting hash to '' doesn't trigger hashchange, so handle manually
      setCurrentPage('home')
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [])

  return { currentPage, navigateTo }
}
