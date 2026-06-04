'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface DBEntry {
  key: string
  name: string
  icon: string
  desc: string
  url: string
  webUrl: string
  embedUrl?: string
  category: 'Operaciones' | 'Movimiento' | 'Gestión'
}

const CATEGORIES: { key: DBEntry['category']; label: string; desc: string }[] = [
  { key: 'Operaciones', label: 'Operaciones', desc: 'Flujo directo del vehículo' },
  { key: 'Movimiento', label: 'Movimiento', desc: 'Rotación, ventas y cliente externo' },
  { key: 'Gestión', label: 'Gestión', desc: 'Administración, finanzas y RRHH' },
]

function DatabasesInner() {
  const [dbs, setDbs] = useState<DBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/databases')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setDbs(res.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = search.trim()
    ? dbs.filter((db) =>
        db.name.toLowerCase().includes(search.toLowerCase()) ||
        db.desc.toLowerCase().includes(search.toLowerCase())
      )
    : dbs

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5 animate-fade-up">
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm px-3 py-2 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
          <DarkModeToggle />
        </div>

        {loading ? (
          <div className="animate-fade-up">
            <div className="flex items-center gap-2 mb-5">
              <Skeleton className="flex-1" style={{ height: 40 }} />
              <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {[1,2,3,4,5,6].map((i) => (
                <Skeleton key={i} style={{ height: 80 }} />
              ))}
            </div>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = filtered.filter((db) => db.category === cat.key)
            if (items.length === 0) return null
            return (
              <div key={cat.key} className="mb-6 animate-fade-up">
                <div className="mb-2">
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{cat.label}</h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{cat.desc}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.map((db) => {
                    const isMobile = typeof navigator !== 'undefined' &&
                      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    return (
                    <a
                      key={db.key}
                      href={isMobile ? db.url : db.webUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card p-3 min-h-[72px] block transition-all duration-150"
                      style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
                    >
                      <span className="text-lg">{db.icon}</span>
                      <p className="text-xs sm:text-sm font-semibold mt-1">{db.name}</p>
                      <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{db.desc}</p>
                    </a>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}


      </div>
    </div>
  )
}

export default function DatabasesPage() {
  return (
    <ThemeProvider>
      <DatabasesInner />
    </ThemeProvider>
  )
}
