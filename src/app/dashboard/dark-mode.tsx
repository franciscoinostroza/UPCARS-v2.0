'use client'

import { useTheme } from './theme-context'

export function DarkModeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="card card-hover w-9 h-9 flex items-center justify-center transition-all active:scale-95"
      aria-label="Toggle dark mode"
      style={{ color: 'var(--text-secondary)' }}
    >
      <span className="text-sm">{dark ? '☀️' : '🌙'}</span>
    </button>
  )
}
