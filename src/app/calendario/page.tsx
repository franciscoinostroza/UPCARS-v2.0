'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Event as RBCEvent } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './calendario.css'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'

const locales = { es }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

interface CalendarEventData {
  id: string
  title: string
  start: string
  allDay: boolean
  type: string
  vehicleId?: string
  vehicleName?: string
}

const TYPE_ICONS: Record<string, string> = {
  compra: '🚗', taller: '🔧', preparacion: '✨', listo: '🏷️',
  logistica: '🚛', rrhh: '👤',
}

const TYPE_LABELS: Record<string, string> = {
  compra: 'Compra', taller: 'Entrada a Taller', preparacion: 'Preparación', listo: 'Listo para venta',
  logistica: 'Logística', rrhh: 'RRHH',
}

function CalendarioInner() {
  const { dark } = useTheme()
  const [events, setEvents] = useState<RBCEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalendarEventData | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/calendar/events')
      const json = await res.json()
      if (json.success) {
        setEvents(
          json.data.map((e: CalendarEventData) => ({
            ...e,
            start: new Date(e.start),
          }))
        )
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const eventPropGetter = useCallback((event: RBCEvent) => ({
    className: `event-${(event as any).type || 'logistica'}`,
  }), [])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>Calendario</h1>
          <DarkModeToggle />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div
              className="w-6 h-6 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin"
            />
          </div>
        ) : (
          <div className="animate-fade-up">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="start"
              views={['month']}
              defaultView="month"
              culture="es"
              popup
              eventPropGetter={eventPropGetter}
              onSelectEvent={(event) => setSelected(event as any)}
              style={{ height: 600 }}
            />
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          >
            <div
              className="card w-full max-w-sm p-5 animate-fade-up"
              style={{ background: 'var(--bg-card)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg">{TYPE_ICONS[selected.type] || '📌'}</span>
                <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                  ✕
                </button>
              </div>
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>{selected.title}</h2>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                {TYPE_LABELS[selected.type] || selected.type}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                {format(new Date(selected.start), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </p>
              {selected.vehicleName && (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Vehículo: <strong style={{ color: 'var(--text)' }}>{selected.vehicleName}</strong>
                </p>
              )}
            </div>
          </div>
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
