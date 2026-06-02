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
}

export default function Home() {
  const [health, setHealth] = useState<HealthInfo | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {})
  }, [])

  const fmt = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8" style={{ background: 'var(--bg)' }}>
      <main className="w-full max-w-sm space-y-4">

        <div className="text-center animate-fade-up">
          <div className="text-4xl mb-2">🚗</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>UPCARS</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ecosistema operativo del concesionario
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <Link href="/dashboard" className="card card-hover rounded-xl p-4 text-center block">
            <span className="text-xl block mb-1">📊</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Dashboard</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Panel operativo</p>
          </Link>
          <Link href="/health" className="card card-hover rounded-xl p-4 text-center block">
            <span className="text-xl block mb-1">🔍</span>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Health Check</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Estado del sistema</p>
          </Link>
        </div>

        {health && (
          <div className="card rounded-xl p-4 animate-fade-up space-y-2.5" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Estado
              </span>
              <span className="pill" style={{
                color: health.status === 'ok' ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {health.status === 'ok' ? 'Operacional' : 'Degradado'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="card flex items-center gap-2 px-2.5 py-2">
                <span>🚗</span>
                <span style={{ color: 'var(--text-secondary)' }}>{health.vehiclesCount ?? '—'} veh.</span>
              </div>
              <div className="card flex items-center gap-2 px-2.5 py-2">
                <span>⏱️</span>
                <span style={{ color: 'var(--text-secondary)' }}>{fmt(health.uptime)}</span>
              </div>
              <div className="card flex items-center gap-2 px-2.5 py-2">
                <span>📋</span>
                <span style={{
                  color: health.notion === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>Notion {health.notion === 'connected' ? '✓' : '✗'}</span>
              </div>
              <div className="card flex items-center gap-2 px-2.5 py-2">
                <span>🗄️</span>
                <span style={{
                  color: health.supabase === 'connected' ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>Supabase {health.supabase === 'connected' ? '✓' : '✗'}</span>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          UPCARS v2
        </p>
      </main>
    </div>
  )
}
