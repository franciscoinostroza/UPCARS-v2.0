'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface HealthInfo {
  status: string
  service: string
  notion: string
  supabase: string
  uptime: number
  vehiclesCount?: number
  lastSync?: string
}

export default function Home() {
  const [health, setHealth] = useState<HealthInfo | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {})
  }, [])

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ background: 'var(--bg)' }}>
      <main className="w-full max-w-lg space-y-6">

        {/* Brand */}
        <div className="text-center animate-fade-up">
          <div className="text-5xl mb-3">🚗</div>
          <h1 className="text-4xl font-bold" style={{ color: 'var(--text)' }}>UPCARS</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ecosistema operativo del concesionario
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <Link
            href="/dashboard"
            className="glass-strong rounded-2xl p-5 text-center hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] group"
          >
            <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">📊</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Dashboard</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Panel operativo</p>
          </Link>

          <Link
            href="/health"
            className="glass-strong rounded-2xl p-5 text-center hover:scale-[1.02] transition-all duration-200 active:scale-[0.98] group"
          >
            <span className="text-2xl block mb-2 transition-transform duration-200 group-hover:scale-110">🔍</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Health Check</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Estado del sistema</p>
          </Link>
        </div>

        {/* Status */}
        {health && (
          <div className="glass rounded-2xl p-5 animate-fade-up space-y-3" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Estado del sistema
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  health.status === 'ok'
                    ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
                    : 'text-red-600 bg-red-50'
                }`}
              >
                {health.status === 'ok' ? '✅ Operacional' : '❌ Error'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span>🚗</span>
                <span style={{ color: 'var(--text-secondary)' }}>{health.vehiclesCount ?? '—'} vehículos</span>
              </div>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span>⏱️</span>
                <span style={{ color: 'var(--text-secondary)' }}>{formatUptime(health.uptime)} activo</span>
              </div>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span>📋</span>
                <span style={{ color: health.notion === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  Notion {health.notion === 'connected' ? '✅' : '❌'}
                </span>
              </div>
              <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
                <span>🗄️</span>
                <span style={{ color: health.supabase === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  Supabase {health.supabase === 'connected' ? '✅' : '❌'}
                </span>
              </div>
            </div>

            {health.lastSync && (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Última sincronización: {health.lastSync}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs animate-fade-up" style={{ animationDelay: '300ms', color: 'var(--text-muted)' }}>
          UPCARS Automation Engine v2
        </p>
      </main>
    </div>
  )
}
