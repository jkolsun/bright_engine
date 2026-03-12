'use client'

import { useEffect, useRef, useState } from 'react'

interface SplitTextProps {
  children: string
  className?: string
  style?: React.CSSProperties
  /** Split by 'chars' or 'words' */
  by?: 'chars' | 'words'
  /** Delay between each character/word animation in ms */
  staggerMs?: number
  /** CSS tag to render (h1, h2, p, span) */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
  /** Animation duration per element in ms */
  duration?: number
}

/**
 * Splitting.js text animation wrapper.
 * Splits text into individual characters or words for staggered reveal animations.
 * Falls back to regular text rendering if Splitting.js is unavailable.
 */
export default function SplitText({
  children,
  className = '',
  style = {},
  by = 'chars',
  staggerMs = 30,
  as: Tag = 'span',
  duration = 600,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const Splitting = (await import('splitting')).default
        if (!ref.current) return

        // Import splitting CSS
        await import('splitting/dist/splitting.css')

        Splitting({ target: ref.current, by })
        setReady(true)
      } catch {
        // Splitting not available — text renders normally
      }
    }

    init()
  }, [by, children])

  const splitCss = ready ? `
    [data-splitting] .char, [data-splitting] .word {
      opacity: 0;
      transform: translateY(20px);
      animation: splitReveal ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    [data-splitting] .char { animation-delay: calc(var(--char-index) * ${staggerMs}ms); }
    [data-splitting] .word { animation-delay: calc(var(--word-index) * ${staggerMs * 2}ms); }
    @keyframes splitReveal {
      to { opacity: 1; transform: translateY(0); }
    }
  ` : ''

  return (
    <>
      {splitCss && <style dangerouslySetInnerHTML={{ __html: splitCss }} />}
      <Tag
        ref={ref as any}
        className={className}
        style={style}
        data-splitting={by}
      >
        {children}
      </Tag>
    </>
  )
}
