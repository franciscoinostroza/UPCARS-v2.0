'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const ThemeContext = createContext({
  dark: false,
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isIframe = window.self !== window.top
    const stored = localStorage.getItem('theme')
    const shouldBeDark = stored === 'dark' || (!stored && (isIframe || window.matchMedia('(prefers-color-scheme: dark)').matches))

    if (shouldBeDark) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
