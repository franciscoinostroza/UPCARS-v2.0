'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface SalesKpis {
  totalSold: number
  totalSoldWithDate: number
  avgSalePrice: number | null
  avgPurchasePrice: number | null
  avgMargin: number | null
  avgDaysToSell: number | null
  avgDaysOnMarket: number | null
  totalRevenue: number
  totalMargin: number
}

interface MonthData {
  month: string
  count: number
  revenue: number
  margin: number
}

interface EmployeeSales {
  id: string
  name: string
  count: number
  revenue: number
  margin: number
}

interface VentaItem {
  id: string
  nombre: string
  precioVenta: number | null
  precioCompra: number | null
  margenBruto: number | null
  margenPorcentaje: number | null
  fechaVenta: string | null
  vehiculoId: string | null
  vendedorId: string | null
  clienteNombre: string
  clienteContacto: string
  formaPago: string
  financiada: boolean
  observaciones: string
}

interface VentasData {
  ventas: VentaItem[]
  salesKpis: SalesKpis
  byMonth: MonthData[]
  byEmployee: EmployeeSales[]
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toFixed(1) + '%'
}

function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${months[parseInt(mo) - 1]} ${y}`
}

function VentasInner() {
  const { dark } = useTheme()
  const [data, setData] = useState<VentasData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ventas')
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
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="flex-1" style={{ height: 72 }} />)}
          </div>
          <Skeleton style={{ height: 200, marginBottom: 16 }} />
          <Skeleton style={{ height: 200 }} />
        </div>
      </div>
    )
  }

  const k = data?.salesKpis
  const months = data?.byMonth || []
  const employees = data?.byEmployee || []
  const ventas = data?.ventas || []

  const maxMonthlyCount = Math.max(...months.map(m => m.count), 1)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 sm:mb-6 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>💰 Rendimiento de Ventas</h1>
          <DarkModeToggle />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {[
            { icon: '🚗', label: 'Vendidos', value: k?.totalSold ?? 0 },
            { icon: '💰', label: 'Precio prom.', value: fmtEur(k?.avgSalePrice) },
            { icon: '📈', label: 'Margen prom.', value: fmtEur(k?.avgMargin) },
            { icon: '📅', label: 'Días prom.', value: k?.avgDaysToSell != null ? k.avgDaysToSell + 'd' : '-' },
            { icon: '💶', label: 'Ingreso total', value: fmtEur(k?.totalRevenue) },
          ].map(s => (
            <div key={s.label} className="card flex flex-col gap-1 px-3 py-2.5 min-h-[68px]">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <p className="text-sm sm:text-base font-bold stat-value" style={{ color: 'var(--text)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Monthly chart */}
        {months.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '75ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Ventas por mes
            </h2>
            <div className="card p-4 sm:p-5">
              <div className="flex items-end gap-2 sm:gap-3" style={{ height: 140 }}>
                {months.map(m => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{m.count}</span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${(m.count / maxMonthlyCount) * 80}%`,
                        minHeight: 4,
                        background: 'var(--accent-blue)',
                        opacity: 0.8,
                      }}
                      title={`${monthLabel(m.month)}: ${m.count} ventas, ${fmtEur(m.revenue)} ingresos`}
                    />
                    <span className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{monthLabel(m.month)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Employee table */}
        {employees.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Rendimiento por empleado
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Empleado</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Vendidos</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Ingresos</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text)' }}>{e.name}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text)' }}>{e.count}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text)' }}>{fmtEur(e.revenue)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text)' }}>{fmtEur(e.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Sales table */}
        <section className="animate-fade-up" style={{ animationDelay: '125ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Ventas registradas {ventas.length > 0 && `(${ventas.length})`}
          </h2>
          {ventas.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay ventas registradas. Cuando un vehículo se marque como "Vendido" aparecerá acá automáticamente.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Venta</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Cliente</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Precio venta</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Margen</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Margen %</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{v.nombre}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{v.clienteNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text)' }}>{fmtEur(v.precioVenta)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: v.margenBruto != null && v.margenBruto > 0 ? 'var(--accent-green, #22c55e)' : 'var(--text)' }}>{fmtEur(v.margenBruto)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtPct(v.margenPorcentaje)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{v.fechaVenta || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{v.formaPago || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Margen summary */}
        {k && (k.totalRevenue > 0 || k.totalMargin > 0) && (
          <div className="mt-4 flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>💰 Ingreso total: <strong>{fmtEur(k.totalRevenue)}</strong></span>
            <span>📈 Margen total: <strong>{fmtEur(k.totalMargin)}</strong></span>
            <span>📊 Margen prom.: <strong>{fmtEur(k.avgMargin)}</strong></span>
          </div>
        )}

      </div>
    </div>
  )
}

export default function VentasPage() {
  return (
    <ThemeProvider>
      <VentasInner />
    </ThemeProvider>
  )
}
