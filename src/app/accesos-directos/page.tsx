'use client'

import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'

const LINKS = [
  { key: 'logistica', icon: '🚛', name: 'Logística', desc: 'Transporte y logística', pageId: '397f70f8470180c28157c96bbd17b99a' },
  { key: 'preparacion', icon: '🧹', name: 'Preparación', desc: 'Preparación previa a venta', pageId: '398f70f84701801382c8e96333ab4226' },
  { key: 'chapa', icon: '🔩', name: 'Chapa y Pintura', desc: 'Trabajos de chapa y pintura', pageId: '398f70f847018062adabf1b015444a94' },
  { key: 'taller', icon: '🔧', name: 'Órdenes de Taller', desc: 'Órdenes de taller mecánico', pageId: '398f70f84701807ca12ad6a08c83be03' },
]

function AccesosDirectosInner() {
  const { dark } = useTheme()
  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6 animate-fade-up">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>⚡ Accesos Directos</h1>
          <DarkModeToggle />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {LINKS.map((link) => (
            <a
              key={link.key}
              href={isMobile ? `notion://notion.so/${link.pageId}` : `https://app.notion.com/p/${link.pageId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card p-4 min-h-[90px] block transition-all duration-150 hover:opacity-80"
              style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
            >
              <span className="text-xl">{link.icon}</span>
              <p className="text-sm font-semibold mt-1">{link.name}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{link.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AccesosDirectosPage() {
  return <ThemeProvider><AccesosDirectosInner /></ThemeProvider>
}
