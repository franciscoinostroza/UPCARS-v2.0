'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HealthData {
  status: string
  service: string
  notion: string
  supabase: string
  uptime: number
  vehiclesCount?: number
  alertsCount?: number
  lastSync?: string
  timestamp: string
}

function formatUptime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  return `${h}h ${m}m ${sec}s`
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

const checks = [
  { key: 'notion', label: 'Notion API', icon: '📋', okLabel: 'Conectado', failLabel: 'Desconectado' },
  { key: 'supabase', label: 'Supabase', icon: '🗄️', okLabel: 'Conectado', failLabel: 'Desconectado' },
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
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-blue)] border-t-transparent animate-spin" />
      </div>
    )
  }

  const statusColor = data?.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="text-center animate-fade-up">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>🔍 Health Check</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Estado del sistema UPCARS
          </p>
        </div>

        {/* Overall status */}
        <div
          className="glass-strong rounded-2xl p-6 text-center animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl animate-pulse-glow"
            style={{
              background: data?.status === 'ok'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            }}
          >
            {data?.status === 'ok' ? '✅' : '❌'}
          </div>
          <p className="text-lg font-bold" style={{ color: statusColor }}>
            {data?.status === 'ok' ? 'Sistema operacional' : 'Error en el sistema'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {data?.service}
          </p>
        </div>

        {/* Service checks */}
        <div className="space-y-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
          {checks.map((c) => {
            const ok = data?.[c.key as keyof HealthData] === 'connected'
            return (
              <div key={c.key} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{c.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.label}</p>
                    <p className="text-xs" style={{ color: ok ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {ok ? c.okLabel : c.failLabel}
                    </p>
                  </div>
                </div>
                <span className={`text-sm ${ok ? 'opacity-100' : 'opacity-50'}`}>
                  {ok ? '✅' : '❌'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Details */}
        {data && (
          <div className="glass rounded-2xl p-5 animate-fade-up space-y-3" style={{ animationDelay: '300ms' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Detalles
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>⏱️ Uptime</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  {formatUptime(data.uptime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>🚗 Vehículos en flujo</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  {data.vehiclesCount ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>⚠️ Alertas activas</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  {data.alertsCount ?? '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>🕐 Última respuesta</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                  {timeAgo(data.timestamp)}
                </span>
              </div>
              {data.lastSync && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)' }}>🔄 Último sync</span>
                  <span className="font-medium tabular-nums" style={{ color: 'var(--text)' }}>
                    {data.lastSync}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back */}
        <div className="text-center animate-fade-up" style={{ animationDelay: '400ms' }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 glass rounded-xl px-5 py-2.5 text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ color: 'var(--text)' }}
          >
            ← Volver al inicio
          </Link>
        </div>

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          UPCARS Automation Engine v2
        </p>
      </div>
    </div>
  )
}
