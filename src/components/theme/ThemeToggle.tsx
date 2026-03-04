'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const icon = theme === 'dark' ? <Moon size={compact ? 16 : 18} />
    : theme === 'system' ? <Monitor size={compact ? 16 : 18} />
    : <Sun size={compact ? 16 : 18} />

  const label = theme === 'dark' ? 'Dark' : theme === 'system' ? 'System' : 'Light'

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-2 text-sm text-slate-300 hover:text-white w-full transition-colors px-3 py-2 rounded-lg hover:bg-slate-700/50"
      title={`Theme: ${label}`}
    >
      {icon}
      {!compact && <span className="text-[13px] font-medium">{label} Mode</span>}
    </button>
  )
}
