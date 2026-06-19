'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface MargenVehiculo {
  name: string
  margen: number
  precioCompra: number | null
  precioVenta: number | null
  fechaVenta: string | null
  dias: number | null
}

interface MargenResumen {
  positivo: number
  negativo: number
  balance: number
  totalVehicles: number
}

interface FinanzasData {
  records: any[]
  kpis: any
  margenResumen: MargenResumen
  margenPorVehiculo: MargenVehiculo[]
  porMes: Record<string, { ingresos: number; egresos: number }>
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
  const [exporting, setExporting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  async function exportPdf() {
    if (!ref.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: '#0a0a0f', scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = (canvas.height * pdfW) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      pdf.save('finanzas-upcars.pdf')
    } catch {
      // silent
    } finally {
      setExporting(false)
    }
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/finanzas')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 animate-fade-up">
            <Skeleton style={{ width: 200, height: 22 }} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
          <div className="flex gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
            {[1,2,3].map(i => <Skeleton key={i} className="flex-1" style={{ height: 72 }} />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Skeleton style={{ height: 240 }} />
            <Skeleton style={{ height: 240 }} />
          </div>
        </div>
      </div>
    )
  }

  const mr = data?.margenResumen
  const margenes = data?.margenPorVehiculo || []
  const porMes = data?.porMes ? Object.entries(data.porMes).sort(([a], [b]) => a.localeCompare(b)) : []
  const records = data?.records || []

  const donutData = [
    { name: 'Ganancias', value: mr?.positivo ?? 0 },
    { name: 'Pérdidas', value: mr?.negativo ?? 0 },
  ].filter(d => d.value > 0)

  const maxMonthly = Math.max(...porMes.map(([, v]) => Math.max(v.ingresos, v.egresos)), 100)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto p-3 sm:p-6 lg:p-8" ref={ref}>

        <div className="flex justify-end mb-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <button onClick={exportPdf} disabled={exporting} className="text-[10px] sm:text-xs px-2 py-1.5 rounded font-medium transition-opacity hover:opacity-70 disabled:opacity-40" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {exporting ? '⋯' : '📄 PDF'}
            </button>
            <DarkModeToggle />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {[
            { icon: '🟢', label: 'Ganancias', value: fmtEur(mr?.positivo), color: '#22c55e' },
            { icon: '🔴', label: 'Pérdidas', value: fmtEur(mr?.negativo), color: '#ef4444' },
            { icon: '⚖️', label: 'Balance', value: fmtEur(mr?.balance), color: (mr?.balance ?? 0) >= 0 ? '#22c55e' : '#ef4444' },
            { icon: '🚗', label: 'Vehículos vendidos', value: mr?.totalVehicles ?? 0, color: 'var(--text)' },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* Donut - Distribución de resultados */}
          <section className="animate-fade-up" style={{ animationDelay: '75ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Distribución de resultados
            </h2>
            <div className="card p-4 flex items-center justify-center" style={{ minHeight: 280 }}>
              {donutData.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos de márgenes</p>
              ) : (
                <div className="relative" style={{ width: 220, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {donutData.map((entry) => (
                          <Cell key={entry.name} fill={entry.name === 'Ganancias' ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none',
                  }}>
                    <p className="text-lg font-bold" style={{ color: (mr?.balance ?? 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                      {fmtEur(mr?.balance)}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Balance</p>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    {donutData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs">
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: d.name === 'Ganancias' ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                        <span style={{ color: 'var(--text)' }}>{d.name}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{fmtEur(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Margen por vehículo */}
          <section className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Margen por vehículo
            </h2>
            <div className="card overflow-x-auto" style={{ maxHeight: 320, overflowY: 'auto' }}>
              {margenes.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin vehículos vendidos con margen</p>
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>
                      <th className="text-left p-2 sm:p-3 font-medium">Vehículo</th>
                      <th className="text-right p-2 sm:p-3 font-medium">Margen</th>
                      <th className="text-right p-2 sm:p-3 font-medium">Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {margenes.map(v => (
                      <tr key={v.name} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="p-2 sm:p-3 font-medium truncate max-w-[200px]" style={{ color: 'var(--text)' }} title={v.name}>
                          {v.name}
                        </td>
                        <td className="text-right p-2 sm:p-3 font-medium" style={{ color: v.margen >= 0 ? '#22c55e' : '#ef4444' }}>
                          {v.margen >= 0 ? '+' : ''}{fmtEur(v.margen)}
                        </td>
                        <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>
                          {v.dias != null ? `${v.dias}d` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </div>

        {/* Monthly evolution */}
        {porMes.length > 0 && (
          <section className="mb-6 animate-fade-up" style={{ animationDelay: '125ms' }}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Evolución mensual
            </h2>
            <div className="card p-4 sm:p-5">
              <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#22c55e', borderRadius: 2, marginRight: 4 }} /> Ganancias</span>
                <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: 2, marginRight: 4 }} /> Pérdidas</span>
              </div>
              <div className="flex items-end gap-2 sm:gap-3" style={{ height: 160 }}>
                {porMes.map(([mes, vals]) => {
                  const ingH = Math.max((vals.ingresos / maxMonthly) * 100, 2)
                  const egrH = Math.max((vals.egresos / maxMonthly) * 100, 2)
                  return (
                    <div key={mes} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                      <span className="text-[9px] font-medium" style={{ color: vals.ingresos > 0 ? '#22c55e' : 'var(--text-muted)' }}>{fmtEur(vals.ingresos)}</span>
                      <div className="w-full flex gap-0.5 justify-center">
                        <div style={{ width: '40%', height: ingH, background: '#22c55e', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`Ganancias ${monthLabel(mes)}: ${fmtEur(vals.ingresos)}`} />
                        <div style={{ width: '40%', height: egrH, background: '#ef4444', borderRadius: '2px 2px 0 0', opacity: 0.8 }} title={`Pérdidas ${monthLabel(mes)}: ${fmtEur(vals.egresos)}`} />
                      </div>
                      <span className="text-[9px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{monthLabel(mes)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* Full records table */}
        <section className="animate-fade-up" style={{ animationDelay: '150ms' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Todos los registros {records.length > 0 && `(${records.length})`}
          </h2>
          {records.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay registros financieros aún.</p>
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
                    <th className="text-left p-2 sm:p-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="p-2 sm:p-3 font-medium" style={{ color: 'var(--text)' }}>{r.concepto || '-'}</td>
                      <td className="p-2 sm:p-3"><span style={{ color: r.tipo === 'Ingreso' ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{r.tipo === 'Ingreso' ? '🟢' : '🔴'} {r.tipo}</span></td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.categoria || '-'}</td>
                      <td className="text-right p-2 sm:p-3 font-medium" style={{ color: r.tipo === 'Ingreso' ? '#22c55e' : '#ef4444' }}>{fmtEur(r.importe)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.fecha || '-'}</td>
                      <td className="p-2 sm:p-3 text-[10px] max-w-[200px] truncate" style={{ color: 'var(--text-muted)' }} title={r.notas || ''}>{r.notas || '-'}</td>
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
