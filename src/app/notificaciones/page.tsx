'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'

interface NotificacionItem {
  id: string; titulo: string; cuerpo: string; leida: boolean
  fecha: string | null; link: string | null; asignados: { id: string; name: string }[]
}

function NotificacionesInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<NotificacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todas')

  const fetchData = useCallback(async () => {
    try {
      const params = filter !== 'todas' ? `?filter=${filter}` : ''
      const res = await fetch(`/api/notificaciones${params}`)
      const json = await res.json()
      if (json.success) setRecords(json.data)
    } catch {} finally { setLoading(false) }
  }, [filter])

  useEffect(() => { fetchData() }, [fetchData])

  const noLeidasCount = records.filter(r => !r.leida).length

  async function marcarLeida(id: string) {
    await fetch('/api/notificaciones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setRecords(prev => prev.map(r => r.id === id ? { ...r, leida: true } : r))
  }

  async function marcarTodas() {
    const ids = records.filter(r => !r.leida).map(r => r.id)
    if (ids.length === 0) return
    await fetch('/api/notificaciones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ marcarTodas: true, ids }) })
    setRecords(prev => prev.map(r => ({ ...r, leida: true })))
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <Skeleton style={{ width: 200, height: 28, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 300 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 20 }}>🔔</span>
            {noLeidasCount > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                {noLeidasCount} nuevas
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {noLeidasCount > 0 && (
              <button onClick={marcarTodas} className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)' }}>
                ✅ Marcar todas leídas
              </button>
            )}
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex gap-1 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
          {(['todas', 'noleidas', 'leidas'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all"
              style={{ background: filter === f ? 'var(--bg-pill)' : 'transparent', color: filter === f ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {f === 'todas' ? '📋 Todas' : f === 'noleidas' ? '🔴 No leídas' : '✅ Leídas'}
            </button>
          ))}
        </div>

        {records.length === 0 ? (
          <div className="card p-8 text-center animate-fade-up">
            <p className="text-lg mb-1" style={{ color: 'var(--text-muted)' }}>🔔</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin notificaciones</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-up">
            {records.map(n => (
              <div key={n.id} onClick={() => { if (!n.leida) marcarLeida(n.id) }}
                className="card p-3 sm:p-4 cursor-pointer transition-all"
                style={{
                  background: 'var(--bg-card)',
                  borderLeft: `3px solid ${n.leida ? 'transparent' : 'var(--accent-blue)'}`,
                  opacity: n.leida ? 0.6 : 1,
                }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{n.leida ? '✅' : '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{n.titulo || 'Sin título'}</p>
                    {n.cuerpo && <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.cuerpo}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {n.fecha && <span>📅 {fmtDate(n.fecha)}</span>}
                      {n.link && <a href={n.link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-blue)' }}>🔗 Link</a>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function NotificacionesPage() {
  return <ThemeProvider><NotificacionesInner /></ThemeProvider>
}
