'use client'

import { useState, useEffect, useCallback } from 'react'
import { Skeleton } from '@/components/skeleton'
import Link from 'next/link'

const STATE_LABELS: Record<string, string> = {
  Stock: 'Stock',
  Exposición: 'Exposición',
  Vendido: 'Vendido',
  Cedido: 'Cedido',
}

const STATE_ICONS: Record<string, string> = {
  Stock: '📦',
  Exposición: '🏪',
  Vendido: '💰',
  Cedido: '↩️',
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
  Stock: ['Exposición', 'Vendido'],
  Exposición: ['Stock', 'Vendido'],
}

const SLA_COLORS: Record<string, string> = {
  green: 'var(--accent-green)',
  yellow: 'var(--accent-yellow)',
  red: 'var(--accent-red)',
}

interface PipelineVehicle {
  id: string
  name: string
  matricula: string
  brand: string
  daysInUbicacion: number
  ubicacion?: string
  daysInState: number
  slaStatus?: 'green' | 'yellow' | 'red' | null
}

interface PipelineColumn {
  state: string
  vehicles: PipelineVehicle[]
}

interface VehicleEvent {
  id: number
  vehicleName: string
  oldState: string | null
  newState: string
  createdAt: string
  daysInState: number
}

interface SLARecord {
  id: number
  area: string
  startTime: string
  endTime: string | null
  threshold: number
  met: boolean | null
  hoursTaken: number | null
}

interface ModalData {
  vehicle: {
    id: string
    name: string
    state: string
    responsable: string | null
    fechaCompra: string | null
    fechaListo: string | null
  }
  events: VehicleEvent[]
  slas: SLARecord[]
}

function VehicleModal({
  vehicleId,
  onClose,
  onVehicleMoved,
}: {
  vehicleId: string
  onClose: () => void
  onVehicleMoved?: () => void
}) {
  const [data, setData] = useState<ModalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/vehicles/${vehicleId}/events`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
      })
      .finally(() => setLoading(false))
  }, [vehicleId])

  const handleMove = useCallback(async (toState: string) => {
    setMoving(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: toState }),
      })
      if (!res.ok) {
        const d = await res.json()
        alert(d.error || 'Error al mover')
      } else {
        onVehicleMoved?.()
        onClose()
      }
    } catch {
      alert('Error de red')
    } finally {
      setMoving(false)
    }
  }, [vehicleId, onClose, onVehicleMoved])

  const totalDays = data?.vehicle.fechaCompra
    ? Math.floor((Date.now() - new Date(data.vehicle.fechaCompra).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl p-5"
        style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex justify-end" style={{ background: 'var(--bg)' }}>
          <button
            onClick={onClose}
            className="text-lg leading-none -mr-1 -mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            {[1,2,3,4].map((i) => (
              <Skeleton key={i} style={{ width: i % 2 === 0 ? '70%' : '85%', height: 14 }} />
            ))}
          </div>
        ) : !data ? (
          <p style={{ color: 'var(--text-muted)' }}>Error al cargar datos</p>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold">{data.vehicle.name}</h2>
                <span className="pill text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {STATE_ICONS[data.vehicle.situacion || data.vehicle.state]} {STATE_LABELS[data.vehicle.situacion || data.vehicle.state] || data.vehicle.situacion || data.vehicle.state}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {totalDays > 0 ? `${totalDays} días en el sistema` : '—'}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Responsable
              </p>
              <p className="text-sm" style={{ color: 'var(--text)' }}>
                {data.vehicle.responsable || 'Sin asignar'}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                Timeline
              </p>
              {data.events.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin eventos registrados</p>
              ) : (
                <div className="max-h-48 overflow-y-auto relative pl-4">
                  <div className="absolute left-[5px] top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />
                  {data.events.map((e) => (
                    <div key={e.id} className="relative pb-3 last:pb-0">
                      <div
                        className="absolute left-[-13px] top-1 w-2 h-2 rounded-full"
                        style={{ background: 'var(--accent-blue)' }}
                      />
                      <p className="text-xs font-medium">
                        {e.oldState ? `${STATE_LABELS[e.oldState] || e.oldState} → ${STATE_LABELS[e.newState] || e.newState}` : `→ ${STATE_LABELS[e.newState] || e.newState}`}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(e.createdAt).toLocaleDateString()} ({e.daysInState}d en estado)
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                SLA por fase
              </p>
              {data.slas.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin registros SLA</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ color: 'var(--text-secondary)' }}>
                        <th className="text-left pb-1 pr-2">Área</th>
                        <th className="text-left pb-1 pr-2">Tiempo real</th>
                        <th className="text-left pb-1 pr-2">Threshold</th>
                        <th className="text-left pb-1">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slas.map((s) => {
                        const displayHours = s.hoursTaken ?? (
                          s.endTime
                            ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60) * 10) / 10
                            : Math.round((Date.now() - new Date(s.startTime).getTime()) / (1000 * 60 * 60) * 10) / 10
                        )
                        const met = s.met ?? (s.endTime ? displayHours <= s.threshold : displayHours <= s.threshold * 0.8)
                        return (
                          <tr key={s.id}>
                            <td className="pb-1 pr-2" style={{ color: 'var(--text)' }}>{s.area}</td>
                            <td className="pb-1 pr-2" style={{ color: 'var(--text)' }}>{displayHours.toFixed(1)}h</td>
                            <td className="pb-1 pr-2" style={{ color: 'var(--text-muted)' }}>{s.threshold}h</td>
                            <td className="pb-1" style={{ color: met ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                              {met ? '✅' : '❌'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              {VALID_NEXT[data.vehicle.state]?.length > 0 && (
                <div className="flex gap-1.5">
                  {VALID_NEXT[data.vehicle.state].map((ns) => (
                    <button
                      key={ns}
                      onClick={() => handleMove(ns)}
                      disabled={moving}
                      className="text-xs px-2.5 py-1 rounded font-medium transition-opacity disabled:opacity-40"
                      style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)' }}
                    >
                      {moving ? '...' : `${STATE_ICONS[ns] || '→'} ${STATE_LABELS[ns] || ns}`}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="text-xs px-2.5 py-1 rounded font-medium ml-auto"
                style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Pipeline({
  columns,
  onVehicleMoved,
}: {
  columns: PipelineColumn[]
  onVehicleMoved?: () => void
}) {
  const [movingId, setMovingId] = useState<string | null>(null)
  const [modalVehicleId, setModalVehicleId] = useState<string | null>(null)

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
    <>
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
                  const slaColor = v.slaStatus ? SLA_COLORS[v.slaStatus] : undefined
                  return (
                    <div
                      key={v.id}
                      className="vehicle-card animate-slide-in cursor-pointer"
                      style={{
                        animationDelay: `${i * 40}ms`,
                        borderLeft: slaColor ? `3px solid ${slaColor}` : undefined,
                      }}
                      onClick={() => setModalVehicleId(v.id)}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs sm:text-sm font-medium truncate min-w-0" style={{ color: 'var(--text)' }}>
                          {v.name || 'Sin nombre'}
                        </p>
                        <Link
                          href={`/vehiculos/${v.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] hover:opacity-70 shrink-0 ml-1"
                          title="Ver detalle"
                        >
                          🔍
                        </Link>
                        {nextStates.length > 0 && (
                          <div className="flex gap-0.5 shrink-0">
                            {nextStates.map((ns) => (
                              <button
                                key={ns}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMove(v.id, ns)
                                }}
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
                          {v.ubicacion || v.brand} · {v.matricula || '—'}
                        </span>
                        <span className="text-[10px] font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>
                          {v.daysInUbicacion > 0 ? `${v.daysInUbicacion}d` : 'hoy'}
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

      {modalVehicleId && (
        <VehicleModal
          vehicleId={modalVehicleId}
          onClose={() => setModalVehicleId(null)}
          onVehicleMoved={onVehicleMoved}
        />
      )}
    </>
  )
}
