import type { CSSProperties } from 'react'
import type { IndustryConfig } from '../config/template-types'

/**
 * Returns an inline gradient style when client colors exist, undefined otherwise.
 * Use alongside brandGradientClass for the className.
 */
export function brandGradientStyle(config: IndustryConfig, direction = 'to bottom right'): CSSProperties | undefined {
  if (!config.primaryHex || !config.secondaryHex) return undefined
  return {
    backgroundImage: `linear-gradient(${direction}, ${config.primaryHex}, ${config.secondaryHex})`,
  }
}

/**
 * Returns Tailwind gradient class only when no client color override.
 * When client colors exist, returns empty string (use brandGradientStyle for inline).
 */
export function brandGradientClass(config: IndustryConfig, prefix = 'bg-gradient-to-br'): string {
  if (config.primaryHex) return ''
  return `${prefix} ${config.gradient}`
}

/**
 * Returns the hex accent color — client override if set, otherwise the provided fallback.
 */
export function brandAccent(config: IndustryConfig, fallback: string): string {
  return config.accentHex || fallback
}

/**
 * Returns an inline background style for the accent color when overrides exist.
 */
export function brandAccentStyle(config: IndustryConfig, fallback: string): CSSProperties {
  return { background: config.accentHex || fallback }
}
