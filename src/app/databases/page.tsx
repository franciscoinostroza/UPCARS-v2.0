'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'

interface DBEntry {
  key: string
  name: string
  icon: string
  desc: string
  url: string
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
        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <div>
            <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>Bases de Datos</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Acceso directo a todas las bases de Notion
            </p>
          </div>
          <DarkModeToggle />
        </div>

        <input
          type="text"
          placeholder="Buscar base de datos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded outline-none mb-5 animate-fade-up"
          style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
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
                  {items.map((db) => (
                    <a
                      key={db.key}
                      href={db.url}
                      target={db.embedUrl ? undefined : '_blank'}
                      rel={db.embedUrl ? undefined : 'noopener noreferrer'}
                      className="card p-3 min-h-[72px] block transition-all duration-150 hover:scale-[1.02]"
                      style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
                    >
                      <span className="text-lg">{db.icon}</span>
                      <p className="text-xs sm:text-sm font-semibold mt-1">{db.name}</p>
                      <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{db.desc}</p>
                    </a>
                  ))}
                </div>
              </div>
            )
          })
        )}

        <p className="text-center text-[11px] mt-6" style={{ color: 'var(--text-muted)' }}>
          UPCARS · Acceso a bases de datos
        </p>
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
