'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ThemeProvider, useTheme } from '../../dashboard/theme-context'
import { DarkModeToggle } from '../../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import Link from 'next/link'

interface Vehicle {
  id: string
  name: string
  matricula: string
  brand: string
  model: string
  year: number
  state: string
  fechaCompra: string
  fechaListo: string | null
  fechaVendido: string | null
  responsable: string | null
  precioCompra: number | null
  precioVenta: number | null
  margenBruto: number | null
  lineaNegocio: string
  tipo: string
  combustible: string
  color: string
  kilometrajeEntrada: number | null
  notas: string
}

interface TimelineEvent {
  id: number
  fecha: string
  oldState: string | null
  newState: string
}

interface Task {
  id: string
  name: string
  priority: string
  state: string
  deadline: string | null
  responsableNombre: string
}

interface Workshop {
  id: string
  nombre: string
  tipo: string
  estado: string
  fechaEntrada: string | null
  fechaSalida: string | null
  responsableNombre: string | null
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

function dayDiff(a: string): number {
  return Math.round((Date.now() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

const STATE_ICONS: Record<string, string> = {
  Comprado: '🛒',
  'Pendiente autorización': '📝',
  Autorizado: '✅',
  'Entregado al concesionario': '🚛',
  'En logística': '🚚',
  'En taller': '🔧',
  'En chapa': '🎨',
  'En preparación': '🧹',
  'Listo para venta': '🏁',
  Vendido: '💰',
  Cedido: '↩️',
}

const STATE_COLORS: Record<string, string> = {
  Comprado: '#22c55e',
  'Pendiente autorización': '#eab308',
  Autorizado: '#22c55e',
  'Entregado al concesionario': '#f97316',
  'En logística': '#3b82f6',
  'En taller': '#f97316',
  'En chapa': '#8b5cf6',
  'En preparación': '#06b6d4',
  'Listo para venta': '#22c55e',
  Vendido: '#22c55e',
  Cedido: '#6b7280',
}

function VehicleDetailInner() {
  const params = useParams()
  const id = params.id as string
  const { dark } = useTheme()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/vehicles/${id}/detail`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">
          <Skeleton style={{ width: 120, height: 16, marginBottom: 8 }} />
          <Skeleton style={{ width: 300, height: 28, marginBottom: 24 }} />
          <Skeleton style={{ height: 180, marginBottom: 16 }} />
          <Skeleton style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }} className="flex items-center justify-center">
        <p style={{ color: 'var(--text-muted)' }}>Vehículo no encontrado</p>
      </div>
    )
  }

  const v: Vehicle = data.vehicle
  const timeline: TimelineEvent[] = data.timeline || []
  const tasks: Task[] = data.tasks || []
  const workshops: Workshop[] = data.workshops || []

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">

        {/* Back */}
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs mb-3 hover:opacity-70" style={{ color: 'var(--accent-blue)' }}>
          ← Volver al Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 animate-fade-up">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{STATE_ICONS[v.state] || '🚗'}</span>
              <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>{v.brand} {v.model}</h1>
            </div>
            <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>{v.matricula || 'Sin matrícula'}</span>
              <span>·</span>
              <span>{v.year || ''}</span>
              {v.lineaNegocio && <><span>·</span><span>{v.lineaNegocio}</span></>}
            </div>
          </div>
          <DarkModeToggle />
        </div>

        {/* State badge + days */}
        <div className="flex items-center gap-2 mb-5 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{
            background: STATE_COLORS[v.state] || '#6b7280',
            color: '#fff',
            opacity: 0.9,
          }}>
            {v.state}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {v.fechaCompra ? `${dayDiff(v.fechaCompra)} días en el sistema` : ''}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

          {/* Info card */}
          <div className="card p-4 animate-fade-up" style={{ animationDelay: '75ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Información
            </h2>
            <div className="space-y-2 text-xs">
              {[
                ['Combustible', v.combustible],
                ['Color', v.color],
                ['Kilometraje', v.kilometrajeEntrada ? `${v.kilometrajeEntrada} km` : '-'],
                ['Tipo', v.tipo],
                ['Línea de negocio', v.lineaNegocio],
                ['Notas', v.notas || '-'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--text)' }}>{val || '-'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Finances card */}
          <div className="card p-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Finanzas
            </h2>
            <div className="space-y-2 text-xs">
              {[
                ['Precio compra', fmtEur(v.precioCompra)],
                ['Precio venta', fmtEur(v.precioVenta)],
                ['Margen bruto', fmtEur(v.margenBruto)],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{val}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--border)' }}>
                {[
                  ['Fecha compra', v.fechaCompra || '-'],
                  ['Fecha listo', v.fechaListo || '-'],
                  ['Fecha venta', v.fechaVendido || '-'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between mt-1">
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span style={{ color: 'var(--text)' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats card */}
          <div className="card p-4 animate-fade-up" style={{ animationDelay: '125ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Resumen
            </h2>
            <div className="space-y-3">
              {[
                { icon: '📋', label: 'Tareas', value: tasks.length },
                { icon: '🔧', label: 'Órdenes taller', value: workshops.length },
                { icon: '📅', label: 'Eventos registrados', value: timeline.length },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {s.icon} {s.label}
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Timeline */}
        <section className="mb-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Línea de tiempo
          </h2>
          {timeline.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin eventos registrados</p>
            </div>
          ) : (
            <div className="card p-4">
              <div className="relative ml-2">
                {timeline.map((event, i) => (
                  <div key={event.id} className="flex gap-3 pb-4 relative">
                    <div className="flex flex-col items-center">
                      <div style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: STATE_COLORS[event.newState] || '#6b7280',
                        flexShrink: 0, zIndex: 1, position: 'relative',
                      }} />
                      {i < timeline.length - 1 && (
                        <div style={{
                          width: 2, flex: 1,
                          background: 'var(--border)',
                          position: 'absolute', top: 14, left: 5,
                        }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pb-2" style={{ borderBottom: i < timeline.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                          {STATE_ICONS[event.newState] || '➡️'} {event.oldState ? `${event.oldState} → ` : ''}{event.newState}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(event.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Tasks */}
        <section className="mb-6 animate-fade-up" style={{ animationDelay: '175ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Tareas {tasks.length > 0 && `(${tasks.length})`}
          </h2>
          {tasks.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin tareas asignadas</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Tarea</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Prioridad</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Responsable</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha límite</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{t.name}</td>
                      <td className="p-2 sm:p-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{
                            background: t.priority === 'Alta' ? 'rgba(239,68,68,0.15)' : t.priority === 'Media' ? 'rgba(234,179,8,0.15)' : 'rgba(107,114,128,0.15)',
                            color: t.priority === 'Alta' ? '#ef4444' : t.priority === 'Media' ? '#eab308' : '#6b7280',
                          }}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{t.state}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{t.responsableNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: t.deadline && new Date(t.deadline) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>{t.deadline || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Workshops */}
        <section className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Órdenes de taller {workshops.length > 0 && `(${workshops.length})`}
          </h2>
          {workshops.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin órdenes de taller</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Orden</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Tipo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Responsable</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Entrada</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {workshops.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{w.nombre}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{w.tipo}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{w.estado}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{w.responsableNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{w.fechaEntrada || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{w.fechaSalida || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default function VehiculoPage() {
  return (
    <ThemeProvider>
      <VehicleDetailInner />
    </ThemeProvider>
  )
}
