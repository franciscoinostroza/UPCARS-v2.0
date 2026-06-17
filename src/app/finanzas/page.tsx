'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface FinanzaRecord {
  id: string
  concepto: string
  tipo: string
  categoria: string
  importe: number | null
  fecha: string | null
  lineaNegocio: string
  notas: string
}

interface FinanzasKPIs {
  totalIngresos: number
  totalEgresos: number
  balanceNeto: number
  totalVentas: number
  totalMargen: number
  ingresosPorCategoria: Record<string, number>
  egresosPorCategoria: Record<string, number>
  porMes: Record<string, { ingresos: number; egresos: number }>
}

interface FinanzasData {
  records: FinanzaRecord[]
  kpis: FinanzasKPIs
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const COLORS: Record<string, string> = {
  Compra: '#ef4444',
  Nóminas: '#f97316',
  Marketing: '#eab308',
  Suministros: '#22c55e',
  'Servicio taller': '#3b82f6',
  Chapa: '#8b5cf6',
  Venta: '#22c55e',
  'Venta Renting': '#06b6d4',
  'V.O': '#14b8a6',
  Otro: '#6b7280',
}

function monthLabel(m: string): string {
  if (m === 'sin-fecha') return 'Sin fecha'
  const [y, mo] = m.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(mo) - 1]} ${y}`
}

function FinanzasInner() {
  const { dark } = useTheme()
  const [data, setData] = useState<FinanzasData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<'todos' | 'Ingreso' | 'Egreso'>('todos')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finanzas')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
            <Skeleton style={{ width: 200, height: 22 }} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
          <div className="flex gap-2 mb-4 sm:mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
            {[1,2,3,4].map(i => <Skeleton key={i} className="flex-1" style={{ height: 72 }} />)}
          </div>
          <Skeleton style={{ height: 200, marginBottom: 16 }} />
          <Skeleton style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  const k = data?.kpis
  const records = data?.records || []

  const meses = k?.porMes ? Object.entries(k.porMes).sort(([a], [b]) => a.localeCompare(b)) : []
  const maxMonthly = Math.max(...meses.map(([, v]) => Math.max(v.ingresos, v.egresos)), 100)

  const filtered = records.filter(r => filtro === 'todos' || r.tipo === filtro)

  const ingresosCat = k?.ingresosPorCategoria ? Object.entries(k.ingresosPorCategoria).sort(([, a], [, b]) => b - a) : []
  const egresosCat = k?.egresosPorCategoria ? Object.entries(k.egresosPorCategoria).sort(([, a], [, b]) => b - a) : []

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>💰 Finanzas</h1>
          <DarkModeToggle />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {[
            { icon: '📈', label: 'Ingresos', value: fmtEur(k?.totalIngresos), color: 'var(--accent-green, #22c55e)' },
            { icon: '📉', label: 'Egresos', value: fmtEur(k?.totalEgresos), color: 'var(--accent-red)' },
            { icon: '⚖️', label: 'Balance', value: fmtEur(k?.balanceNeto), color: (k?.balanceNeto ?? 0) >= 0 ? 'var(--accent-green, #22c55e)' : 'var(--accent-red)' },
            { icon: '🚗', label: 'Ventas', value: k ? `${k.totalVentas} · ${fmtEur(k.totalMargen)} margen` : '-', color: 'var(--text)' },
          ].map(s => (
            <div key={s.label} className="card flex flex-col gap-1 px-3 py-2.5 min-h-[68px]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <p className="text-sm sm:text-base font-bold stat-value" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Monthly chart */}
        {meses.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '75ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Ingresos vs Egresos por mes
            </h2>
            <div className="card p-4 sm:p-5">
              <div className="flex items-end gap-2 sm:gap-3" style={{ height: 160 }}>
                {meses.map(([mes, vals]) => {
                  const ingH = Math.max((vals.ingresos / maxMonthly) * 100, 2)
                  const egrH = Math.max((vals.egresos / maxMonthly) * 100, 2)
                  return (
                    <div key={mes} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--accent-green, #22c55e)' }}>{fmtEur(vals.ingresos)}</span>
                      <div className="w-full flex gap-0.5 justify-center">
                        <div style={{ width: '40%', height: ingH, background: 'var(--accent-green, #22c55e)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`Ingresos ${monthLabel(mes)}: ${fmtEur(vals.ingresos)}`} />
                        <div style={{ width: '40%', height: egrH, background: 'var(--accent-red)', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`Egresos ${monthLabel(mes)}: ${fmtEur(vals.egresos)}`} />
                      </div>
                      <span className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{monthLabel(mes)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* By category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          {ingresosCat.length > 0 && (
            <div className="card p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent-green, #22c55e)' }}>
                Ingresos por categoría
              </h3>
              <div className="space-y-2">
                {ingresosCat.map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text)' }}>{cat}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--accent-green, #22c55e)' }}>{fmtEur(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {egresosCat.length > 0 && (
            <div className="card p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent-red)' }}>
                Egresos por categoría
              </h3>
              <div className="space-y-2">
                {egresosCat.map(([cat, val]) => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text)' }}>{cat}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--accent-red)' }}>{fmtEur(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pie chart - ingresos por categoría */}
        {ingresosCat.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '105ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent-green, #22c55e)' }}>
              Distribución de ingresos
            </h2>
            <div className="card p-4">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={ingresosCat.map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                  >
                    {ingresosCat.map(([name]) => (
                      <Cell key={name} fill={COLORS[name] || '#22c55e'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : value)}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {ingresosCat.map(([name, value]) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[name] || '#22c55e', display: 'inline-block' }} />
                    <span style={{ color: 'var(--text)' }}>{name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{fmtEur(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Pie chart - gastos por categoría */}
        {egresosCat.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '110ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--accent-red)' }}>
              Distribución de gastos
            </h2>
            <div className="card p-4">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={egresosCat.map(([name, value]) => ({ name, value }))}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                  >
                    {egresosCat.map(([name]) => (
                      <Cell key={name} fill={COLORS[name] || '#666'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => (typeof value === 'number' ? value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : value)}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {egresosCat.map(([name, value]) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs">
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[name] || '#666', display: 'inline-block' }} />
                    <span style={{ color: 'var(--text)' }}>{name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{fmtEur(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Records table */}
        <section className="animate-fade-up" style={{ animationDelay: '125ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Registros financieros {records.length > 0 && `(${filtered.length}/${records.length})`}
            </h2>
            <div className="flex gap-1">
              {(['todos', 'Ingreso', 'Egreso'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all"
                  style={{
                    background: filtro === f ? 'var(--bg-pill)' : 'transparent',
                    color: filtro === f ? 'var(--text)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {f === 'todos' ? 'Todos' : f}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay registros financieros aún. Agregalos desde Notion en la DB Finanzas.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Concepto</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Tipo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Categoría</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Importe</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{r.concepto || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: r.tipo === 'Ingreso' ? 'var(--accent-green, #22c55e)' : 'var(--accent-red)' }}>{r.tipo}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.categoria || '-'}</td>
                      <td className="text-right p-2 sm:p-3 font-medium" style={{ color: r.tipo === 'Ingreso' ? 'var(--accent-green, #22c55e)' : 'var(--accent-red)' }}>{fmtEur(r.importe)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.fecha || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default function FinanzasPage() {
  return (
    <ThemeProvider>
      <FinanzasInner />
    </ThemeProvider>
  )
}
