'use client'

import { useState } from 'react'

interface CalItem {
  id: string
  titulo: string
  fecha: string
  estado: string
  area?: string
  tipo?: string
}

interface CalendarViewProps {
  items: CalItem[]
  typeColors?: Record<string, string>
  filterType?: string
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth() && a.getDate() === d.getDate()
}

export default function CalendarView({ items, typeColors, filterType }: CalendarViewProps) {
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const colors = typeColors || { tarea: '#3b82f6', taller: '#f97316', evento: '#8b5cf6' }
  const days = getMonthDays(year, month)
  const today = new Date()
  const filtrados = items.filter(i => !filterType || i.tipo === filterType)
  const dayItems = selectedDay ? filtrados.filter(i => sameDay(selectedDay, i.fecha)) : []

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2 items-center">
          <button onClick={() => { setMonth(m => m === 0 ? (setYear(y => y - 1), 11) : m - 1); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>‹</button>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{MONTHS[month]} {year}</span>
          <button onClick={() => { setMonth(m => m === 11 ? (setYear(y => y + 1), 0) : m + 1); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>›</button>
          <button onClick={() => { const n = new Date(); setYear(n.getFullYear()); setMonth(n.getMonth()); setSelectedDay(null) }} className="card px-2 py-1 text-xs" style={{ color: 'var(--text)' }}>Hoy</button>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{filtrados.length} eventos</span>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--border)' }}>
        {DAYS.map(d => (
          <div key={d} className="p-1.5 sm:p-2 text-[10px] sm:text-xs font-semibold text-center" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>{d}</div>
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
                outline: isToday ? '2px solid #3b82f6' : 'none',
                outlineOffset: '-2px',
                borderRadius: 2,
              }}
            >
              <span className="text-[10px] sm:text-xs font-medium" style={{ color: isToday ? '#3b82f6' : 'var(--text-muted)' }}>{date.getDate()}</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {dayFiltrados.slice(0, 5).map(item => (
                  <div key={item.id} className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ background: colors[item.tipo || 'taller'] || '#666' }} title={item.titulo} />
                ))}
                {dayFiltrados.length > 5 && <span className="text-[8px] sm:text-[10px]" style={{ color: 'var(--text-muted)' }}>+{dayFiltrados.length - 5}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {selectedDay && dayItems.length > 0 && (
        <section className="mt-4 animate-fade-up">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left p-2 sm:p-3 font-medium">Título</th>
                  <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                  <th className="text-left p-2 sm:p-3 font-medium">Área</th>
                </tr>
              </thead>
              <tbody>
                {dayItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
  )
}
