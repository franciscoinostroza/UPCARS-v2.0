'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HealthData {
  status: string
  notion: string
  supabase: string
  uptime: number
  vehiclesCount?: number
  alertsCount?: number
  timestamp: string
}

const fmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${Math.floor(s % 60)}s`

const services = [
  { key: 'notion', label: 'Notion API', icon: '📋' },
  { key: 'supabase', label: 'Supabase', icon: '🗄️' },
]

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-6 h-6 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
      </div>
    )
  }

  const ok = data?.status === 'ok'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-sm mx-auto p-4 sm:p-6 space-y-4">

        <div className="text-center animate-fade-up">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Health Check</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Estado del sistema UPCARS
          </p>
        </div>

        <div className="card rounded-xl p-5 text-center animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl"
            style={{ background: ok ? 'rgba(76, 175, 80, 0.1)' : 'rgba(235, 87, 87, 0.1)' }}
          >
            {ok ? '✅' : '❌'}
          </div>
          <p className="text-base font-bold" style={{ color: ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {ok ? 'Sistema operacional' : 'Error en el sistema'}
          </p>
        </div>

        <div className="space-y-1.5 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {services.map((s) => {
            const connected = data?.[s.key as keyof HealthData] === 'connected'
            return (
              <div key={s.key} className="card rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>{s.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.label}</p>
                    <p className="text-xs" style={{ color: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {connected ? 'Conectado' : 'Desconectado'}
                    </p>
                  </div>
                </div>
                <span style={{ color: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {connected ? '✓' : '✗'}
                </span>
              </div>
            )
          })}
        </div>

        {data && (
          <div className="card rounded-xl p-4 animate-fade-up space-y-2" style={{ animationDelay: '300ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Detalles
            </h2>
            <div className="space-y-1.5 text-sm">
              {[
                ['⏱️ Uptime', fmt(data.uptime)],
                ['🚗 Vehículos', String(data.vehiclesCount ?? '—')],
                ['⚠️ Alertas', String(data.alertsCount ?? '—')],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>{label as string}</span>
                  <span className="font-medium stat-value" style={{ color: 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center animate-fade-up" style={{ animationDelay: '400ms' }}>
          <Link href="/" className="card card-hover inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm"
            style={{ color: 'var(--text)' }}
          >
            ← Volver
          </Link>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          UPCARS v2
        </p>
      </div>
    </div>
  )
}
