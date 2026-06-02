'use client'

import { useEffect, useState, useCallback } from 'react'
import { ThemeProvider, useTheme } from './theme-context'
import { DarkModeToggle } from './dark-mode'
import Pipeline from './pipeline'

interface KPIStats {
  slas: Record<string, { avg: number; count: number }>
  compliance: Record<string, number>
  activeAlerts: { id: string; vehicle_name: string; type: string; message: string; created_at: string }[]
  totalEvents: number
}

interface PipelineData {
  state: string
  vehicles: { id: string; name: string; matricula: string; brand: string; daysInState: number }[]
}

const AREA_LABELS: Record<string, string> = {
  Taller: 'Taller',
  Chapa: 'Chapa',
  Preparacion: 'Preparación',
  Logistica: 'Logística',
}

const ALERT_ICONS: Record<string, string> = {
  sla_violation: '⏰',
  vehicle_no_responsible: '👤',
  chapa_prolonged: '🔄',
  stuck_in_comprado: '🚫',
  task_overdue: '📋',
}

function DashboardInner() {
  const { dark } = useTheme()
  const [kpis, setKpis] = useState<KPIStats | null>(null)
  const [pipeline, setPipeline] = useState<PipelineData[]>([])
  const [pipelineTotal, setPipelineTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    try {
      const [kpiRes, pipeRes] = await Promise.all([
        fetch('/api/kpis'),
        fetch('/api/vehicles'),
      ])
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
  }, [])

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
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  const complianceEntries = Object.entries(kpis?.compliance || {})
  const slas = kpis?.slas || {}
  const alerts = kpis?.activeAlerts || []
  const totalEvents = kpis?.totalEvents || 0

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
          <div>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>UPCARS</h1>
            <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Panel operativo del concesionario
            </p>
          </div>
          <DarkModeToggle />
        </div>

        {/* Stats chips */}
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {[
            { icon: '📊', label: 'Eventos', value: totalEvents },
            { icon: '🚗', label: 'En flujo', value: pipelineTotal },
            { icon: '⚠️', label: 'Alertas', value: alerts.length, accent: alerts.length > 0 },
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

        {/* Pipeline */}
        <section className="mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
            Pipeline de vehículos
          </h2>
          <Pipeline columns={pipeline} onVehicleMoved={fetchAll} />
        </section>

        {/* SLA + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
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
                    <span className="mt-0.5">{ALERT_ICONS[alert.type] || '⚠️'}</span>
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

        <p className="text-center text-xs mt-6 sm:mt-8 pb-4" style={{ color: 'var(--text-muted)' }}>
          UPCARS · Los datos se actualizan cada 30s
        </p>
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
