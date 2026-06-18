'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface CalItem {
  id: string
  titulo: string
  fecha: string
  tipo: 'tarea' | 'taller' | 'evento'
  estado: string
  area: string
  responsableId: string | null
  prioridad: string | null
}

interface CalData {
  items: CalItem[]
  tasksCount: number
  workshopsCount: number
  eventsCount: number
}

const TIPO_COLORS: Record<string, string> = {
  tarea: '#3b82f6',
  taller: '#f97316',
  evento: '#8b5cf6',
}

const TIPO_LABELS: Record<string, string> = {
  tarea: 'Tarea',
  taller: 'Taller',
  evento: 'Evento',
}

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: Date[] = []

  let startDay = first.getDay() - 1
  if (startDay < 0) startDay = 6

  for (let i = 0; i < startDay; i++) days.push(new Date(0))
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))

  const remaining = (7 - (days.length % 7)) % 7
  for (let i = 0; i < remaining; i++) days.push(new Date(0))

  return days
}

function sameDay(a: Date, b: string): boolean {
  const d = new Date(b)
  return a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
}

function CalendarioInner() {
  const { dark } = useTheme()
  const [data, setData] = useState<CalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [filterTipo, setFilterTipo] = useState<string>('todos')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/calendario')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const days = getMonthDays(year, month)
  const today = new Date()
  const filtrados = (data?.items || []).filter(i => filterTipo === 'todos' || i.tipo === filterTipo)
  const dayItems = selectedDay ? filtrados.filter(i => sameDay(selectedDay, i.fecha)) : []

  const counts = {
    tareas: (data?.items || []).filter(i => i.tipo === 'tarea').length,
    talleres: (data?.items || []).filter(i => i.tipo === 'taller').length,
    eventos: (data?.items || []).filter(i => i.tipo === 'evento').length,
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 animate-fade-up">
          <Skeleton style={{ width: 200, height: 22, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 400 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>📅 Calendario</h1>
          <DarkModeToggle />
        </div>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {[
            { label: 'Tareas', count: counts.tareas, color: TIPO_COLORS.tarea },
            { label: 'Taller', count: counts.talleres, color: TIPO_COLORS.taller },
            { label: 'Eventos', count: counts.eventos, color: TIPO_COLORS.evento },
          ].map(s => (
            <div key={s.label} className="card flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <span className="font-bold" style={{ color: 'var(--text)' }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center justify-between mb-3 animate-fade-up" style={{ animationDelay: '75ms' }}>
          <div className="flex gap-1">
            {(['todos', 'tarea', 'taller', 'evento'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterTipo(f)}
                className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all"
                style={{
                  background: filterTipo === f ? 'var(--bg-pill)' : 'transparent',
                  color: filterTipo === f ? 'var(--text)' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                {f === 'todos' ? 'Todo' : TIPO_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setMonth(m => m === 0 ? (setYear(y => y - 1), 11) : m - 1); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>‹</button>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
            <button onClick={() => { setMonth(m => m === 11 ? (setYear(y => y + 1), 0) : m + 1); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>›</button>
            <button onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>Hoy</button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--border)' }}>
            {DAYS.map(d => (
              <div key={d} className="p-1.5 sm:p-2 text-[10px] sm:text-xs font-semibold text-center" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
            {days.map((date, i) => {
              if (date.getTime() === 0) return <div key={`e${i}`} style={{ background: 'var(--bg)' }} />
              const dateStr = date.toISOString().split('T')[0]
              const dayFiltrados = filtrados.filter(item => item.fecha && sameDay(date, item.fecha))
              const isToday = sameDay(date, today.toISOString().split('T')[0])
              const isSelected = selectedDay && sameDay(date, selectedDay.toISOString().split('T')[0])

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelectedDay(dayFiltrados.length > 0 ? date : selectedDay)}
                  className="min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 cursor-pointer transition-all hover:opacity-80"
                  style={{
                    background: isSelected ? 'var(--bg-pill)' : 'var(--bg)',
                    outline: isToday ? '2px solid var(--accent-blue)' : 'none',
                    outlineOffset: '-2px',
                    borderRadius: 2,
                  }}
                >
                  <span className="text-[10px] sm:text-xs font-medium" style={{ color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                    {date.getDate()}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {dayFiltrados.slice(0, 5).map(item => (
                      <div
                        key={item.id}
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                        style={{ background: TIPO_COLORS[item.tipo] || '#666' }}
                        title={item.titulo}
                      />
                    ))}
                    {dayFiltrados.length > 5 && (
                      <span className="text-[8px] sm:text-[10px]" style={{ color: 'var(--text-muted)' }}>+{dayFiltrados.length - 5}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected day details */}
        {selectedDay && dayItems.length > 0 && (
          <section className="mt-4 animate-fade-up">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
              {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Tipo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Título</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Área</th>
                  </tr>
                </thead>
                <tbody>
                  {dayItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3">
                        <span className="inline-flex items-center gap-1">
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: TIPO_COLORS[item.tipo], display: 'inline-block' }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{TIPO_LABELS[item.tipo]}</span>
                        </span>
                      </td>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{item.titulo}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{item.estado}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{item.area || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

export default function CalendarioPage() {
  return (
    <ThemeProvider>
      <CalendarioInner />
    </ThemeProvider>
  )
}
