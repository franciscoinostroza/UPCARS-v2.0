'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface LogItem {
  id: string
  nombre: string
  vehiculoId: string | null
  responsableNombre: string | null
  estado: string
  fechaProgramada: string | null
  fechaRealizada: string | null
  ubicacion: string
  situacionComercial: string
  prioridad: string
  observaciones: string
}

const ESTADOS = ['Pendiente autorización', 'Autorizado', 'Completado', 'Bloqueado']
const ESTADO_ICONS: Record<string, string> = {
  'Pendiente autorización': '⏳',
  'Autorizado': '📝',
  'Completado': '✅',
  'Bloqueado': '🚫',
}

function fmtDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function LogisticaInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<LogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const res = await fetch(`/api/logistica${params.toString() ? '?' + params.toString() : ''}`)
      const json = await res.json()
      if (json.success) setRecords(json.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [filterEstado])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = ESTADOS.map(est => ({
    estado: est,
    items: records.filter(r => r.estado === est),
  }))

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <Skeleton style={{ width: 200, height: 22, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 300 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>🚛 Logística</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(true)} className="text-[10px] sm:text-xs px-2 py-1.5 rounded font-medium" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>➕ Nuevo</button>
            <DarkModeToggle />
          </div>
        </div>

        {/* Toggle + Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="flex gap-1">
            <button onClick={() => setVista('tabla')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'tabla' ? 'var(--bg-pill)' : 'transparent', color: vista === 'tabla' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📋 Tabla</button>
            <button onClick={() => setVista('kanban')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'kanban' ? 'var(--bg-pill)' : 'transparent', color: vista === 'kanban' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📊 Kanban</button>
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Kanban View */}
        {vista === 'kanban' ? (
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '75ms' }}>
            {columns.map(col => (
              <div key={col.estado} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <span className="text-xs">{ESTADO_ICONS[col.estado] || '📋'}</span>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{col.estado}</h3>
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{col.items.length}</span>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {col.items.length === 0 ? (
                    <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                  ) : col.items.map(item => (
                    <div key={item.id} className="vehicle-card p-2">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
                      <div className="flex items-center gap-1 text-[10px] mt-1 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                        {item.ubicacion && <span>📍 {item.ubicacion}</span>}
                        {item.responsableNombre && <span>👤 {item.responsableNombre}</span>}
                        {item.fechaProgramada && <span>📅 {fmtDate(item.fechaProgramada)}</span>}
                      </div>
                      <a href={`https://www.notion.so/${item.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] mt-1 inline-block" style={{ color: 'var(--accent-blue)' }}>🔗 Abrir</a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="card overflow-x-auto animate-fade-up" style={{ animationDelay: '75ms' }}>
            {records.length === 0 ? (
              <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros de logística</p></div>
            ) : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">ID</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Ubicación</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Responsable</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha prog.</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha real.</th>
                    <th className="text-center p-2 sm:p-3 font-medium">🔗</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium truncate max-w-[120px]" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-2 sm:p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: r.estado === 'Completado' ? 'rgba(34,197,94,0.12)' : r.estado === 'Autorizado' ? 'rgba(59,130,246,0.12)' : r.estado === 'Bloqueado' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                        color: r.estado === 'Completado' ? '#22c55e' : r.estado === 'Autorizado' ? '#3b82f6' : r.estado === 'Bloqueado' ? '#ef4444' : '#eab308',
                      }}>{r.estado}</span></td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.ubicacion || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.responsableNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaProgramada)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaRealizada)}</td>
                      <td className="text-center p-2 sm:p-3"><a href={`https://www.notion.so/${r.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>🔗</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function LogisticaPage() {
  return (
    <ThemeProvider>
      <LogisticaInner />
    </ThemeProvider>
  )
}
