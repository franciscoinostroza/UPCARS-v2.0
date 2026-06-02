'use client'

import { useEffect, useState } from 'react'
import { useTheme } from './theme-context'

export function DarkModeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="relative w-10 h-10 rounded-xl glass flex items-center justify-center transition-all hover:scale-110 active:scale-95"
      aria-label="Toggle dark mode"
    >
      <span className="text-lg transition-all duration-300" style={{
        transform: dark ? 'rotate(0deg)' : 'rotate(360deg)',
      }}>
        {dark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}
