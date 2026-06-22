'use client'

import { useEffect, useState, useCallback } from 'react'
import { ThemeProvider, useTheme } from './theme-context'
import { DarkModeToggle } from './dark-mode'
import Pipeline from './pipeline'
import { Skeleton } from '@/components/skeleton'

interface KPIStats {
  slas: Record<string, { avg: number; count: number }>
  compliance: Record<string, number>
  bottlenecks?: { area: string; avgHours: number; maxHours: number; count: number }[]
  activeAlerts: { id: string; vehicle_name: string; type: string; message: string; created_at: string }[]
  totalEvents: number
  employeeKPIs?: { id: string; name: string; role: string; department: string; tasksCompleted: number; tasksTotal: number; efficiency: number }[]
  vehicleKPIs?: Record<string, { areas: { area: string; hours: number; threshold: number; met: boolean }[]; totalHours: number; allMet: boolean }>
}

interface PipelineData {
  state: string
  vehicles: { id: string; name: string; matricula: string; brand: string; ubicacion?: string; daysInUbicacion: number; daysInState: number }[]
}

const AREA_LABELS: Record<string, string> = {
  Taller: 'Taller',
  Chapa: 'Chapa',
  Preparacion: 'Preparación',
  Logistica: 'Logística',
}

function getAlertIcon(type: string): string {
  if (type.startsWith('stuck_in_')) return '🚫'
  const icons: Record<string, string> = {
    sla_violation: '⏰',
    vehicle_no_responsible: '👤',
    chapa_prolonged: '🔄',
    task_overdue: '📋',
  }
  return icons[type] || '⚠️'
}

function DashboardInner() {
  const { dark } = useTheme()
  const [kpis, setKpis] = useState<KPIStats | null>(null)
  const [pipeline, setPipeline] = useState<PipelineData[]>([])
  const [pipelineTotal, setPipelineTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [filterResponsable, setFilterResponsable] = useState('')
  const [filterMarca, setFilterMarca] = useState('')

  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterResponsable) params.set('responsable', filterResponsable)
      if (filterMarca) params.set('marca', filterMarca)
      const qs = params.toString()

      const [kpiRes, pipeRes, empRes] = await Promise.all([
        fetch('/api/kpis'),
        fetch(`/api/vehicles${qs ? '?' + qs : ''}`),
        fetch('/api/employees'),
      ])
      const empData = await empRes.json()
      if (empData.success) setEmployees(empData.data)
      const kpiData = await kpiRes.json()
      const pipeData = await pipeRes.json()

      if (kpiData.success) setKpis(kpiData.data)
      if (pipeData.success) {
        setPipeline(pipeData.data.pipeline)
        setPipelineTotal(pipeData.data.total)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filterResponsable, filterMarca])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  async function handleResolveAlert(alertId: string) {
    setResolvingId(alertId)
    try {
      const res = await fetch(`/api/alerts/${alertId}`, { method: 'PATCH' })
      if (res.ok) {
        setKpis((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            activeAlerts: prev.activeAlerts.filter((a) => a.id !== alertId),
          }
        })
      }
    } catch {
      // silent
    } finally {
      setResolvingId(null)
    }
  }

  if (loading) {
    const PIPELINE_STATES = ['Stock', 'Exposición', 'Vendido', 'Cedido']
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
            <Skeleton style={{ width: 160, height: 22 }} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>

          <div className="flex gap-2 mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
            {[1,2,3,4].map((i) => (
              <Skeleton key={i} className="flex-1" style={{ height: 72 }} />
            ))}
          </div>

          <div className="flex items-center gap-2 mb-3 animate-fade-up" style={{ animationDelay: '75ms' }}>
            <Skeleton style={{ width: 160, height: 16 }} />
            <Skeleton style={{ width: 28, height: 16, borderRadius: 8 }} />
          </div>

          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {PIPELINE_STATES.map((_, i) => (
              <div key={i} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 140 }}>
                <Skeleton style={{ width: '60%', height: 14, marginBottom: 10 }} />
                <div className="space-y-1.5 sm:space-y-2">
                  {[1,2,3].map((j) => (
                    <Skeleton key={j} style={{ width: '100%', height: 52 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 animate-fade-up" style={{ animationDelay: '150ms' }}>
            <Skeleton style={{ height: 140 }} />
            <Skeleton style={{ height: 140 }} />
          </div>
        </div>
      </div>
    )
  }

  const complianceEntries = Object.entries(kpis?.compliance || {})
  const slas = kpis?.slas || {}
  const alerts = kpis?.activeAlerts || []
  const totalEvents = kpis?.totalEvents || 0
  const vehicleKPIs = kpis?.vehicleKPIs || {}
  const vehicleKPIEntries = Object.entries(vehicleKPIs)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex justify-end mb-4 sm:mb-6 animate-fade-up">
          <DarkModeToggle />
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {[
            { icon: '📊', label: 'Eventos', value: totalEvents },
            { icon: '🚗', label: 'En flujo', value: pipelineTotal },
            { icon: '⚠️', label: 'Alertas', value: alerts.length, accent: alerts.length > 0 },
            { icon: '✅', label: 'SLA cumplido', value: vehicleKPIEntries.filter(([, v]: any) => v.allMet).length + '/' + vehicleKPIEntries.length, accent: vehicleKPIEntries.length > 0 && vehicleKPIEntries.filter(([, v]: any) => !v.allMet).length > 0 },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2 min-h-[44px]">
              <span className="text-sm sm:text-base">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
                <p className="text-sm sm:text-base font-bold stat-value" style={{
                  color: s.accent ? 'var(--accent-red)' : 'var(--text)',
                }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3 animate-fade-up" style={{ animationDelay: '125ms' }}>
          <select
            value={filterResponsable}
            onChange={(e) => setFilterResponsable(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value="">👤 Todos los responsables</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="🔍 Filtrar por marca..."
            value={filterMarca}
            onChange={(e) => setFilterMarca(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', width: 160 }}
          />
          {(filterResponsable || filterMarca) && (
            <button
              onClick={() => { setFilterResponsable(''); setFilterMarca('') }}
              className="text-[11px] px-2 py-1.5 rounded font-medium"
              style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ✕ Limpiar
            </button>
          )}
        </div>

        {/* Pipeline */}
        <section className="mb-4 sm:mb-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
            Pipeline de vehículos
          </h2>
          <Pipeline columns={pipeline} onVehicleMoved={fetchAll} />
        </section>

        {/* SLA + Bottlenecks + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-3 sm:p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3 sm:mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cumplimiento de SLA
            </h2>
            <div className="space-y-2.5 sm:space-y-3">
              {['Taller', 'Chapa', 'Preparacion', 'Logistica'].map((area) => {
                const avg = slas[area]?.avg
                const pct = kpis?.compliance[area]
                return (
                  <div key={area}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm" style={{ color: 'var(--text)' }}>{AREA_LABELS[area] || area}</span>
                      <span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                        {avg ? `${avg.toFixed(1)}h · ` : ''}
                        {pct !== undefined ? (
                          <span className="font-semibold" style={{
                            color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                          }}>{pct}%</span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div className="sla-bar-fill" style={{
                        width: `${pct || 0}%`,
                        backgroundColor: pct !== undefined
                          ? pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                          : 'transparent',
                      }} />
                    </div>
                  </div>
                )
              })}
              {complianceEntries.length === 0 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin datos de SLA aún.</p>
              )}
            </div>
          </div>

          <div className="card p-3 sm:p-5 animate-fade-up" style={{ animationDelay: '225ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3 sm:mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cuellos de botella
            </h2>
            {kpis?.bottlenecks && kpis.bottlenecks.length > 0 ? (
              <div className="space-y-2.5 sm:space-y-3">
                {kpis.bottlenecks.map((b) => (
                  <div key={b.area}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs sm:text-sm" style={{ color: 'var(--text)' }}>{b.area}</span>
                      <span className="text-[10px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-semibold">{b.avgHours.toFixed(1)}h</span> avg · {b.maxHours.toFixed(1)}h max · {b.count} ops
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div className="sla-bar-fill" style={{
                        width: `${Math.min((b.avgHours / (b.avgHours + 24)) * 100, 100)}%`,
                        backgroundColor: b.avgHours > 72 ? 'var(--accent-red)' : b.avgHours > 48 ? 'var(--accent-yellow)' : 'var(--accent-green)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 text-center">
                <span className="text-xl sm:text-2xl mb-2">📊</span>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin datos suficientes aún.</p>
              </div>
            )}
          </div>

          <div className="card p-3 sm:p-5 animate-fade-up" style={{ animationDelay: '250ms' }}>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Alertas activas
              </h2>
              {alerts.length > 0 && (
                <span className="pill" style={{ background: 'rgba(235, 87, 87, 0.1)', color: 'var(--accent-red)' }}>
                  {alerts.length}
                </span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 sm:py-6 text-center">
                <span className="text-xl sm:text-2xl mb-2">✅</span>
                <p className="text-sm" style={{ color: 'var(--text)' }}>Todo en orden</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No hay alertas activas</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 sm:max-h-64 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div key={alert.id} className="vehicle-card flex items-start gap-2 min-h-[44px]">
                    <span className="mt-0.5">{getAlertIcon(alert.type)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                        {alert.vehicle_name}
                      </p>
                      <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {alert.message}
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="shrink-0 text-[11px] px-2 py-1 rounded font-medium transition-opacity disabled:opacity-40 hover:opacity-80"
                      style={{ background: 'var(--bg-pill)', color: 'var(--accent-green)' }}
                    >
                      {resolvingId === alert.id ? '...' : '✓'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employee KPIs */}
        {kpis?.employeeKPIs && kpis.employeeKPIs.length > 0 && (
          <section className="mt-4 sm:mt-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
              Rendimiento de empleados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {kpis.employeeKPIs.map((emp) => (
                <div key={emp.id} className="card p-3 sm:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{emp.name}</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{emp.role} · {emp.department}</p>
                    </div>
                    <span className="text-sm font-bold" style={{
                      color: emp.efficiency >= 80 ? 'var(--accent-green)' : emp.efficiency >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                    }}>{emp.efficiency}%</span>
                  </div>
                  <div className="sla-bar">
                    <div className="sla-bar-fill" style={{
                      width: `${emp.efficiency}%`,
                      backgroundColor: emp.efficiency >= 80 ? 'var(--accent-green)' : emp.efficiency >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                    }} />
                  </div>
                  <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    {emp.tasksCompleted}/{emp.tasksTotal} tareas completadas
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}


      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ThemeProvider>
      <DashboardInner />
    </ThemeProvider>
  )
}
