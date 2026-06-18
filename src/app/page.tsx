'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/skeleton'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) return
        const data = await res.json()
        setHealth({ ...data, status: data.status === 'ok' ? 'ok' : 'error' })
      } catch {
        setHealth({ status: 'error', service: 'error', notion: 'error', supabase: 'error', uptime: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4" style={{ background: 'var(--bg)' }}>
      <div className="max-w-sm w-full space-y-3 sm:space-y-4">
        {/* Logo + status */}
        <div className="text-center animate-fade-up">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xl">🚗</span>
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>UPCARS</h1>
          </div>
          <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
            Serverless Automation Engine
          </p>
        </div>

        {/* Status */}
        {loading ? (
          <div className="card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
              <Skeleton style={{ width: 8, height: 8, borderRadius: '50%' }} />
              <Skeleton style={{ width: 120, height: 16 }} />
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              <Skeleton style={{ height: 36 }} />
              <Skeleton style={{ height: 36 }} />
            </div>
          </div>
        ) : (
          <div className="card p-4 sm:p-5 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
              <div className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`} />
              <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text)' }}>
                {health?.status === 'ok' ? 'Sistema operativo' : 'Error de conexión'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
              {[
                ['Notion', health?.notion],
                ['Supabase', health?.supabase],
              ].map(([label, val]) => (
                <div key={label as string} className="flex items-center gap-1.5 sm:gap-2 min-h-[36px] sm:min-h-[40px] px-2 sm:px-3 rounded" style={{ background: 'var(--bg-card)' }}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${val === 'connected' ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`} />
                  <span>{label as string}</span>
                  <span className="ml-auto font-medium">{val === 'connected' ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
            {health?.vehiclesCount !== undefined && (
              <p className="mt-3 text-[11px] sm:text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {health.vehiclesCount} vehículos sincronizados
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <Link href="/dashboard" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>📊 Dashboard →</Link>
          <Link href="/ventas" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>💰 Ventas →</Link>
          <Link href="/finanzas" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>💶 Finanzas →</Link>
          <Link href="/calendario" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>📅 Calendario →</Link>
          <Link href="/tareas" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>📋 Tareas →</Link>
          <Link href="/noticias" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>📰 Noticias →</Link>
          <Link href="/botones" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>🔘 Botones →</Link>
          <Link href="/databases" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>🗄️ Bases de datos →</Link>
          <Link href="/health" className="card text-center font-medium px-3 py-2.5 sm:py-2 text-xs sm:text-sm min-h-[44px] flex items-center justify-center" style={{ color: 'var(--text)' }}>🔍 Health Check →</Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px]" style={{ color: 'var(--text-muted)' }}>
          version 2.0
        </p>
      </div>
    </div>
  )
}
