'use client'

import { useEffect, useState } from 'react'

interface KPIStats {
  slas: Record<string, { avg: number; count: number }>
  compliance: Record<string, number>
  activeAlerts: { id: string; vehicle_name: string; type: string; message: string; created_at: string }[]
  totalEvents: number
}

const AREA_LABELS: Record<string, string> = {
  Taller: '🔧 Taller',
  Chapa: '🎨 Chapa y Pintura',
  Preparacion: '✨ Preparación',
  Logistica: '🚛 Logística',
}

const AREA_COLORS: Record<string, string> = {
  Taller: 'bg-blue-50 border-blue-200',
  Chapa: 'bg-purple-50 border-purple-200',
  Preparacion: 'bg-green-50 border-green-200',
  Logistica: 'bg-orange-50 border-orange-200',
}

const ALERT_ICONS: Record<string, string> = {
  sla_violation: '⏰',
  vehicle_no_responsible: '👤',
  chapa_prolonged: '🔄',
  stuck_in_comprado: '🚫',
  task_overdue: '📋',
}

export default function DashboardPage() {
  const [data, setData] = useState<KPIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/kpis')
        const json = await res.json()
        if (json.success) {
          setData(json.data)
        } else {
          setError('Error al cargar datos')
        }
      } catch {
        setError('Error de conexión')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-500">Cargando dashboard...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-red-500">{error || 'Sin datos disponibles'}</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">UPCARS</h1>
        <p className="text-gray-500 mt-1">Panel operativo del concesionario</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {Object.entries(data.slas).map(([area, stats]) => (
          <div key={area} className={`rounded-xl border p-5 ${AREA_COLORS[area] || 'bg-white border-gray-200'}`}>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {AREA_LABELS[area] || area}
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {stats.avg.toFixed(1)} <span className="text-sm font-normal text-gray-500">horas</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{stats.count} órdenes</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4">Cumplimiento de SLA (%)</h2>
          <div className="space-y-3">
            {Object.entries(data.compliance).map(([area, pct]) => (
              <div key={area}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{AREA_LABELS[area] || area}</span>
                  <span className={`font-medium ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(data.compliance).length === 0 && (
              <p className="text-gray-400 text-sm">Sin datos de SLA aún</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-4">Alertas activas ({data.activeAlerts.length})</h2>
          {data.activeAlerts.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay alertas activas</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm">
                  <span className="text-lg">{ALERT_ICONS[alert.type] || '⚠️'}</span>
                  <div>
                    <p className="font-medium text-red-800">{alert.vehicle_name}</p>
                    <p className="text-red-600 text-xs">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{data.totalEvents}</p>
          <p className="text-sm text-gray-500 mt-1">Eventos registrados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">{data.activeAlerts.length}</p>
          <p className="text-sm text-gray-500 mt-1">Alertas activas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="text-3xl font-bold text-gray-900">
            {Object.keys(data.slas).length}
          </p>
          <p className="text-sm text-gray-500 mt-1">Áreas con SLA</p>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-gray-400">
        UPCARS Automation Engine v2 · Los datos se actualizan cada 30s
      </footer>
    </div>
  )
}
