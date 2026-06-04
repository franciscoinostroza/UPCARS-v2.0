'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/skeleton'

interface HealthData {
  status: string
  uptime: number
  notion: string
  supabase: string
  vehiclesCount: number
  alertsCount: number
  syncStatus?: string
  lastSync?: string
  dbSchema?: string[]
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch('/api/health')
        if (!res.ok) throw new Error('Health check failed')
        const json = await res.json()
        setData(json)
      } catch {
        setData({
          status: 'error',
          uptime: 0,
          notion: 'disconnected',
          supabase: 'disconnected',
          vehiclesCount: 0,
          alertsCount: 0,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-lg mx-auto p-3 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
            <Skeleton style={{ width: 120, height: 22 }} />
            <Skeleton style={{ width: 80, height: 16 }} />
          </div>
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <Skeleton style={{ height: 80 }} />
            <Skeleton style={{ height: 120 }} />
            <Skeleton style={{ height: 80 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto p-3 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>🩺 Health Check</h1>
          <Link href="/dashboard" className="text-sm" style={{ color: 'var(--accent-blue)' }}>
            ← Dashboard
          </Link>
        </div>

        {/* Status badge */}
        <div className="card p-3 sm:p-5 mb-3 sm:mb-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <div className={`w-2 h-2 rounded-full ${data?.status === 'ok' ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`} />
            <span className="text-sm sm:text-base font-semibold" style={{ color: 'var(--text)' }}>
              {data?.status === 'ok' ? 'All Systems Operational' : 'Service Disruption'}
            </span>
          </div>
          <div className="space-y-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            <div className="flex items-center justify-between min-h-[32px]">
              <span>Uptime</span>
              <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>
                {data?.uptime !== undefined ? `${data.uptime.toFixed(1)}h` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between min-h-[32px]">
              <span>Vehicles synced</span>
              <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{data?.vehiclesCount ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between min-h-[32px]">
              <span>Active alerts</span>
              <span className="font-mono font-medium" style={{ color: data?.alertsCount && data.alertsCount > 0 ? 'var(--accent-red)' : 'var(--text)' }}>
                {data?.alertsCount ?? '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-2 sm:space-y-3 animate-fade-up" style={{ animationDelay: '150ms' }}>
          {[
            {
              name: 'Notion API',
              status: data?.notion as string,
              icon: '📄',
            },
            {
              name: 'Supabase DB',
              status: data?.supabase as string,
              icon: '🗄️',
            },
            {
              name: 'Sync Status',
              status: data?.syncStatus as string,
              icon: '🔄',
              extra: data?.lastSync,
            },
          ].map((svc, i) => (
            <div key={svc.name} className="card p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-h-[52px]" style={{ animationDelay: `${200 + i * 50}ms` }}>
              <span className="text-base sm:text-lg">{svc.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text)' }}>{svc.name}</p>
                {svc.status && (
                  <p className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {svc.status}
                    {svc.extra ? ` · ${svc.extra}` : ''}
                  </p>
                )}
              </div>
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                svc.status === 'connected' || svc.status === 'synced'
                  ? 'bg-[var(--accent-green)]'
                  : svc.status === 'partial'
                    ? 'bg-[var(--accent-yellow)]'
                    : 'bg-[var(--accent-red)]'
              }`} />
            </div>
          ))}
        </div>

        {/* DB Schema */}
        {data?.dbSchema && data.dbSchema.length > 0 && (
          <div className="card p-3 sm:p-4 mt-3 sm:mt-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
              Database Tables
            </h2>
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {data.dbSchema.map((table) => (
                <span key={table} className="pill text-[11px] sm:text-xs" style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}>
                  {table}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] mt-6 pb-4" style={{ color: 'var(--text-muted)' }}>
          <Link href="/" className="mr-2" style={{ color: 'var(--accent-blue)' }}>← Home</Link>
          UPCARS v2
        </p>
      </div>
    </div>
  )
}
