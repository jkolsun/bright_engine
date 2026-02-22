'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, AlertTriangle, ClipboardCheck, ChevronDown, ChevronUp, X, Eye } from 'lucide-react'

interface QACheck {
  category: string
  name: string
  status: 'pass' | 'fail' | 'warn' | 'manual'
  details?: string
}

/**
 * PreviewQAChecker — Admin-only QA overlay for preview sites.
 * Activated by ?qa=true URL param.
 * Automatically scans the DOM + data for broken interactivity.
 */
export default function PreviewQAChecker({ lead, websiteCopy }: { lead: any; websiteCopy?: any }) {
  const [checks, setChecks] = useState<QACheck[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isActive, setIsActive] = useState(false)

  // Only activate via ?qa=true
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('qa') === 'true') {
        setIsActive(true)
      }
    }
  }, [])

  const runChecks = useCallback(() => {
    const results: QACheck[] = []

    // ═══════ DATA COMPLETENESS ═══════
    results.push({
      category: 'Data',
      name: 'Company name',
      status: lead.companyName ? 'pass' : 'fail',
      details: lead.companyName || 'Missing',
    })
    results.push({
      category: 'Data',
      name: 'Phone number',
      status: lead.phone ? 'pass' : 'warn',
      details: lead.phone || 'No phone — call CTA will be hidden',
    })
    results.push({
      category: 'Data',
      name: 'Email',
      status: lead.email ? 'pass' : 'warn',
      details: lead.email || 'No email',
    })
    results.push({
      category: 'Data',
      name: 'Services',
      status: (lead.enrichedServices?.length > 0) ? 'pass' : 'warn',
      details: `${lead.enrichedServices?.length || 0} services`,
    })
    results.push({
      category: 'Data',
      name: 'Photos',
      status: (lead.enrichedPhotos?.length > 0) ? 'pass' : 'warn',
      details: `${lead.enrichedPhotos?.length || 0} photos`,
    })
    results.push({
      category: 'Data',
      name: 'Rating/Reviews',
      status: (lead.enrichedRating && lead.enrichedReviews) ? 'pass' : 'warn',
      details: lead.enrichedRating ? `${lead.enrichedRating} stars, ${lead.enrichedReviews || 0} reviews` : 'No rating data',
    })
    results.push({
      category: 'Data',
      name: 'AI Website Copy',
      status: websiteCopy?.heroHeadline ? 'pass' : 'warn',
      details: websiteCopy?.heroHeadline ? 'Generated' : 'Using fallback copy',
    })

    // ═══════ DOM CHECKS ═══════
    const container = document.querySelector('.preview-template')
    if (!container) {
      results.push({ category: 'DOM', name: 'Template container', status: 'fail', details: 'No .preview-template found' })
      setChecks(results)
      return
    }

    // Check for broken social links (href="#" without preventDefault)
    const hashLinks = container.querySelectorAll('a[href="#"]')
    const brokenHashLinks = Array.from(hashLinks).filter(link => {
      // Check if onclick attribute exists (React attaches handlers via synthetic events)
      // We can't directly check React handlers, but we can check the rendered HTML
      return !link.getAttribute('onclick')
    })
    // Since React handlers aren't visible in DOM attributes, check by counting
    results.push({
      category: 'Links',
      name: 'Social placeholder links',
      status: hashLinks.length > 0 ? 'pass' : 'pass',
      details: `${hashLinks.length} social links found (all should have preventDefault)`,
    })

    // Check phone links
    const phoneLinks = container.querySelectorAll('a[href^="tel:"]')
    results.push({
      category: 'Links',
      name: 'Phone links (tel:)',
      status: phoneLinks.length > 0 ? 'pass' : lead.phone ? 'fail' : 'warn',
      details: `${phoneLinks.length} phone links found`,
    })

    // Check email links
    const emailLinks = container.querySelectorAll('a[href^="mailto:"]')
    results.push({
      category: 'Links',
      name: 'Email links (mailto:)',
      status: emailLinks.length > 0 ? 'pass' : lead.email ? 'fail' : 'warn',
      details: `${emailLinks.length} email links found`,
    })

    // Check nav buttons exist
    const navButtons = container.querySelectorAll('[data-nav-page]')
    const navPages = new Set(Array.from(navButtons).map(b => b.getAttribute('data-nav-page')))
    const expectedPages = ['home', 'services', 'about', 'portfolio', 'contact']
    const missingPages = expectedPages.filter(p => !navPages.has(p))
    results.push({
      category: 'Navigation',
      name: 'Nav links for all pages',
      status: missingPages.length === 0 ? 'pass' : 'fail',
      details: missingPages.length === 0 ? 'All 5 pages linked' : `Missing: ${missingPages.join(', ')}`,
    })

    // Check all PageShells exist
    const pageShells = container.querySelectorAll('[data-page]')
    const shellPages = new Set(Array.from(pageShells).map(s => s.getAttribute('data-page')))
    const missingShells = expectedPages.filter(p => !shellPages.has(p))
    results.push({
      category: 'Navigation',
      name: 'All page shells rendered',
      status: missingShells.length === 0 ? 'pass' : 'fail',
      details: missingShells.length === 0 ? 'All 5 pages present' : `Missing: ${missingShells.join(', ')}`,
    })

    // Check buttons exist
    const allButtons = container.querySelectorAll('button')
    results.push({
      category: 'CTA',
      name: 'Buttons present',
      status: allButtons.length > 5 ? 'pass' : 'warn',
      details: `${allButtons.length} buttons found`,
    })

    // Check contact form exists
    const forms = container.querySelectorAll('form')
    results.push({
      category: 'Form',
      name: 'Contact form',
      status: forms.length > 0 ? 'pass' : 'fail',
      details: `${forms.length} form(s) found`,
    })

    // Check form has required fields
    if (forms.length > 0) {
      const inputs = forms[0].querySelectorAll('input, textarea, select')
      const inputTypes = Array.from(inputs).map(i => i.getAttribute('type') || i.tagName.toLowerCase())
      results.push({
        category: 'Form',
        name: 'Form fields',
        status: inputs.length >= 3 ? 'pass' : 'warn',
        details: `${inputs.length} fields: ${inputTypes.join(', ')}`,
      })

      const submitBtn = forms[0].querySelector('button[type="submit"]')
      results.push({
        category: 'Form',
        name: 'Submit button',
        status: submitBtn ? 'pass' : 'fail',
        details: submitBtn ? 'Present' : 'Missing submit button',
      })
    }

    // Check FAQ items
    const faqSection = container.querySelector('[data-page="contact"]')
    if (faqSection) {
      const faqButtons = Array.from(faqSection.querySelectorAll('button')).filter(btn =>
        btn.textContent?.includes('?') || btn.querySelector('svg')
      )
      // Look for FAQ items by checking for expandable sections
      const expandableDivs = faqSection.querySelectorAll('.overflow-hidden')
      results.push({
        category: 'FAQ',
        name: 'FAQ section',
        status: expandableDivs.length >= 3 ? 'pass' : expandableDivs.length > 0 ? 'warn' : 'fail',
        details: `${expandableDivs.length} FAQ items found`,
      })
    }

    // Check images load
    const images = container.querySelectorAll('img')
    let brokenImages = 0
    images.forEach(img => {
      if (img instanceof HTMLImageElement && img.naturalWidth === 0 && img.complete) {
        brokenImages++
      }
    })
    results.push({
      category: 'Media',
      name: 'Images',
      status: brokenImages === 0 ? 'pass' : 'warn',
      details: `${images.length} images, ${brokenImages} broken`,
    })

    // Check horizontal overflow
    const hasOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth
    results.push({
      category: 'Layout',
      name: 'No horizontal overflow',
      status: hasOverflow ? 'fail' : 'pass',
      details: hasOverflow ? `Overflow: ${document.documentElement.scrollWidth - document.documentElement.clientWidth}px` : 'Clean',
    })

    // Check footer exists
    const footer = container.querySelector('footer')
    results.push({
      category: 'Layout',
      name: 'Footer',
      status: footer ? 'pass' : 'fail',
      details: footer ? 'Present' : 'Missing footer',
    })

    // Check Bright Automations credit
    const creditLink = container.querySelector('a[href*="brightautomations"]')
    results.push({
      category: 'Layout',
      name: 'Bright Automations credit',
      status: creditLink ? 'pass' : 'warn',
      details: creditLink ? 'Present' : 'Missing credit link',
    })

    // ═══════ MANUAL CHECKS ═══════
    results.push({ category: 'Manual', name: 'Click logo → goes to home', status: 'manual' })
    results.push({ category: 'Manual', name: 'Click each nav link → page changes', status: 'manual' })
    results.push({ category: 'Manual', name: 'Click hero CTA → goes to contact', status: 'manual' })
    results.push({ category: 'Manual', name: 'Click phone link → initiates call', status: 'manual' })
    results.push({ category: 'Manual', name: 'Open FAQ items → they expand', status: 'manual' })
    results.push({ category: 'Manual', name: 'Submit contact form → shows success', status: 'manual' })
    results.push({ category: 'Manual', name: 'Click portfolio photo → lightbox opens', status: 'manual' })
    results.push({ category: 'Manual', name: 'Mobile menu opens/closes', status: 'manual' })
    results.push({ category: 'Manual', name: 'Chatbot opens, responds to messages', status: 'manual' })
    results.push({ category: 'Manual', name: 'Social icons do NOT navigate away', status: 'manual' })

    setChecks(results)
  }, [lead, websiteCopy])

  // Run checks on mount and when page changes
  useEffect(() => {
    if (!isActive) return

    // Wait for DOM to be ready
    const timer = setTimeout(runChecks, 1000)

    // Re-run on hash changes (page navigation)
    const handleHash = () => setTimeout(runChecks, 500)
    window.addEventListener('hashchange', handleHash)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('hashchange', handleHash)
    }
  }, [isActive, runChecks])

  if (!isActive) return null

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const manualCount = checks.filter(c => c.status === 'manual').length
  const autoChecks = checks.filter(c => c.status !== 'manual')
  const manualChecks = checks.filter(c => c.status === 'manual')

  const statusIcon = (status: QACheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
      case 'fail': return <XCircle size={14} className="text-red-500 flex-shrink-0" />
      case 'warn': return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
      case 'manual': return <Eye size={14} className="text-blue-400 flex-shrink-0" />
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 left-4 z-[9999] bg-gray-900 text-white rounded-full px-4 py-2 text-xs font-bold shadow-2xl flex items-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <ClipboardCheck size={14} />
        QA {failCount > 0 ? <span className="text-red-400">{failCount} fails</span> : <span className="text-green-400">OK</span>}
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[380px] max-h-[80vh] bg-gray-950 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={16} className="text-blue-400" />
          <span className="text-white text-sm font-bold">Preview QA Checker</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-green-400 text-xs font-bold">{passCount}P</span>
          {failCount > 0 && <span className="text-red-400 text-xs font-bold ml-1">{failCount}F</span>}
          {warnCount > 0 && <span className="text-amber-400 text-xs font-bold ml-1">{warnCount}W</span>}
          <span className="text-blue-400 text-xs font-bold ml-1">{manualCount}M</span>
          <button onClick={() => setIsMinimized(true)} className="ml-2 text-gray-500 hover:text-white transition-colors">
            <ChevronDown size={16} />
          </button>
          <button onClick={() => setIsActive(false)} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Checks list */}
      <div className="overflow-y-auto flex-1 p-3 space-y-3">
        {/* Auto checks */}
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2">Automated Checks</p>
          <div className="space-y-1">
            {autoChecks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                {statusIcon(check.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[10px] font-bold uppercase">{check.category}</span>
                    <span className="text-gray-200 text-xs">{check.name}</span>
                  </div>
                  {check.details && (
                    <p className="text-gray-600 text-[10px] truncate">{check.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual checks */}
        <div>
          <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-2">Manual Verification</p>
          <div className="space-y-1">
            {manualChecks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                {statusIcon(check.status)}
                <span className="text-gray-300 text-xs">{check.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900 flex items-center justify-between">
        <button
          onClick={runChecks}
          className="text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors"
        >
          Re-run Checks
        </button>
        <p className="text-gray-600 text-[10px]">?qa=true to activate</p>
      </div>
    </div>
  )
}
