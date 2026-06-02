'use client'

import { useEffect, useState } from 'react'
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

const ALERT_COLORS: Record<string, string> = {
  sla_violation: 'border-l-red-400',
  vehicle_no_responsible: 'border-l-yellow-400',
  chapa_prolonged: 'border-l-purple-400',
  stuck_in_comprado: 'border-l-orange-400',
  task_overdue: 'border-l-blue-400',
}

function DashboardInner() {
  const { dark } = useTheme()
  const [kpis, setKpis] = useState<KPIStats | null>(null)
  const [pipeline, setPipeline] = useState<PipelineData[]>([])
  const [pipelineTotal, setPipelineTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
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
    }

    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Cargando...</p>
        </div>
      </div>
    )
  }

  const complianceEntries = Object.entries(kpis?.compliance || {})
  const slas = kpis?.slas || {}
  const alerts = kpis?.activeAlerts || []
  const totalEvents = kpis?.totalEvents || 0

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-fade-up">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              UPCARS
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Panel operativo del concesionario
            </p>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
          </div>
        </header>

        {/* Stats chips */}
        <div className="flex flex-wrap gap-3 mb-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-lg">📊</span>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Eventos</p>
              <p className="text-lg font-bold stat-value" style={{ color: 'var(--text)' }}>{totalEvents}</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-lg">🚗</span>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>En flujo</p>
              <p className="text-lg font-bold stat-value" style={{ color: 'var(--text)' }}>{pipelineTotal}</p>
            </div>
          </div>
          <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Alertas</p>
              <p className="text-lg font-bold stat-value" style={{ color: alerts.length > 0 ? 'var(--accent-red)' : 'var(--text)' }}>
                {alerts.length}
              </p>
            </div>
          </div>
          {complianceEntries.length > 0 && (
            <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2.5">
              <span className="text-lg">🎯</span>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>SLA global</p>
                <p className="text-lg font-bold stat-value" style={{ color: 'var(--text)' }}>
                  {Math.round(
                    complianceEntries.reduce((s, [, v]) => s + v, 0) / complianceEntries.length
                  )}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <section className="mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
            Pipeline de vehículos
          </h2>
          <Pipeline columns={pipeline} />
        </section>

        {/* SLA + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* SLA */}
          <div className="glass-strong rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-5" style={{ color: 'var(--text-secondary)' }}>
              Cumplimiento de SLA
            </h2>
            <div className="space-y-4">
              {['Taller', 'Chapa', 'Preparacion', 'Logistica'].map((area) => {
                const avg = slas[area]?.avg
                const pct = kpis?.compliance[area]
                return (
                  <div key={area} className="animate-slide-in">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                        {AREA_LABELS[area] || area}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {avg ? `${avg.toFixed(1)}h · ` : ''}
                        {pct !== undefined ? (
                          <span className="font-semibold" style={{
                            color: pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                          }}>
                            {pct}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </span>
                    </div>
                    <div className="sla-bar">
                      <div
                        className="sla-bar-fill"
                        style={{
                          width: `${pct || 0}%`,
                          backgroundColor: pct !== undefined
                            ? pct >= 80 ? 'var(--accent-green)' : pct >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                            : 'transparent',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              {complianceEntries.length === 0 && (
                <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  Sin datos de SLA aún. Los datos aparecerán cuando los vehículos pasen por las áreas.
                </p>
              )}
            </div>
          </div>

          {/* Alerts */}
          <div className="glass-strong rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Alertas activas
              </h2>
              {alerts.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}
                >
                  {alerts.length}
                </span>
              )}
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-3xl mb-2">✅</span>
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Todo en orden</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>No hay alertas activas</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`vehicle-card ${ALERT_COLORS[alert.type] || 'border-l-gray-400'} border-l-2 animate-slide-in`}
                  >
                    <div className="flex items-start gap-2">
                      <span>{ALERT_ICONS[alert.type] || '⚠️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                          {alert.vehicle_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs pb-8 animate-fade-up" style={{ animationDelay: '500ms', color: 'var(--text-muted)' }}>
          UPCARS Automation Engine v2 · Los datos se actualizan cada 30s ·{' '}
          <button
            onClick={() => window.location.reload()}
            className="underline hover:no-underline"
            style={{ color: 'var(--accent-blue)' }}
          >
            Recargar
          </button>
        </footer>
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
