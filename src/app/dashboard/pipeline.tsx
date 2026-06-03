'use client'

import { useState } from 'react'

const STATE_LABELS: Record<string, string> = {
  Comprado: 'Comprado',
  'En logística': 'Logística',
  'En taller': 'Taller',
  'En chapa': 'Chapa y Pintura',
  'En preparación': 'Preparación',
  'Listo para venta': 'Listo para venta',
}

const STATE_ICONS: Record<string, string> = {
  Comprado: '📋',
  'En logística': '🚛',
  'En taller': '🔧',
  'En chapa': '🎨',
  'En preparación': '✨',
  'Listo para venta': '✅',
}

const VALID_NEXT: Record<string, string[]> = {
  Comprado: ['En logística'],
  'En logística': ['En taller', 'En chapa'],
  'En taller': ['En chapa', 'En preparación'],
  'En chapa': ['En taller', 'En preparación'],
  'En preparación': ['Listo para venta'],
  'Listo para venta': [],
}

interface PipelineVehicle {
  id: string
  name: string
  matricula: string
  brand: string
  daysInState: number
  combustible?: string
}

interface PipelineColumn {
  state: string
  vehicles: PipelineVehicle[]
}

export default function Pipeline({
  columns,
  onVehicleMoved,
}: {
  columns: PipelineColumn[]
  onVehicleMoved?: () => void
}) {
  const [movingId, setMovingId] = useState<string | null>(null)

  async function handleMove(vehicleId: string, toState: string) {
    setMovingId(vehicleId)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: toState }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Error al mover vehículo')
      } else {
        onVehicleMoved?.()
      }
    } catch {
      alert('Error de red al mover vehículo')
    } finally {
      setMovingId(null)
    }
  }

  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-2 px-2">
      {columns.map((col, idx) => (
        <div
          key={col.state}
          className="pipeline-column p-2 sm:p-3 animate-fade-up"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs">{STATE_ICONS[col.state]}</span>
              <h3 className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--text-secondary)' }}>
                {STATE_LABELS[col.state]}
              </h3>
            </div>
            <span className="pill flex-shrink-0 ml-1" style={{ color: 'var(--text-secondary)' }}>
              {col.vehicles.length}
            </span>
          </div>

          <div className="space-y-1 sm:space-y-1.5 min-h-[40px] sm:min-h-[60px]">
            {col.vehicles.length === 0 ? (
              <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>Vacío</p>
            ) : (
              col.vehicles.map((v, i) => {
                const nextStates = VALID_NEXT[col.state] || []
                return (
                  <div
                    key={v.id}
                    className="vehicle-card animate-slide-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs sm:text-sm font-medium truncate min-w-0" style={{ color: 'var(--text)' }}>
                        {v.name || 'Sin nombre'}
                      </p>
                      {nextStates.length > 0 && (
                        <div className="flex gap-0.5 shrink-0">
                          {nextStates.map((ns) => (
                            <button
                              key={ns}
                              onClick={() => handleMove(v.id, ns)}
                              disabled={movingId === v.id}
                              className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
                              style={{
                                background: 'var(--bg-pill)',
                                color: 'var(--accent-blue)',
                              }}
                              title={`Mover a ${STATE_LABELS[ns] || ns}`}
                            >
                              {movingId === v.id ? '...' : STATE_ICONS[ns] || '→'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] sm:text-xs truncate mr-1" style={{ color: 'var(--text-muted)' }}>
                        {v.brand} · {v.matricula || '—'}
                        {v.combustible ? ` · ${v.combustible}` : ''}
                      </span>
                      <span className="text-[10px] sm:text-[11px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {v.daysInState > 0 ? `${v.daysInState}d` : 'hoy'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
