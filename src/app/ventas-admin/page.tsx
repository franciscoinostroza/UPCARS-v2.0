'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'
import VehicleAutocomplete from '@/components/vehicle-autocomplete'
import SearchableSelect from '@/components/searchable-select'

interface VentaAdminItem {
  id: string; nombre: string; vehiculoId: string | null; vehiculoNombre: string | null
  precioVenta: number | null; precioCompra: number | null; margenBruto: number | null
  margenPorcentaje: number | null; fechaVenta: string | null
  vendedorId: string | null; vendedorNombre: string | null
  clienteNombre: string; clienteContacto: string; formaPago: string; financiada: boolean; observaciones: string
}

function fmtEuro(n: number | null) { return n != null ? n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' }

function VentasAdminInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<VentaAdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [selected, setSelected] = useState<VentaAdminItem | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string }[]>([])
  const [createData, setCreateData] = useState({ vehiculoId: '', fechaVenta: '', precioVenta: '', vendedorId: '', clienteNombre: '', clienteContacto: '', formaPago: '', observaciones: '' })

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterVendedor) params.set('vendedor', filterVendedor)
      const [res, empRes, vehRes] = await Promise.all([
        fetch(`/api/ventas-admin${params.toString() ? '?' + params : ''}`),
        fetch('/api/employees'),
        fetch('/api/vehicles?list=true'),
      ])
      const json = await res.json()
      const empJson = await empRes.json()
      const vehJson = await vehRes.json()
      if (json.success) setRecords(json.data)
      if (empJson.success) setEmployees(empJson.data)
      if (vehJson.success) setVehicles(vehJson.data)
    } catch {} finally { setLoading(false) }
  }, [filterVendedor])

  useEffect(() => { fetchData() }, [fetchData])

  const totalRevenue = records.reduce((s, r) => s + (r.precioVenta || 0), 0)
  const totalMargin = records.reduce((s, r) => s + (r.margenBruto || 0), 0)

  if (loading) {
    return <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        <Skeleton style={{ width: 200, height: 22, marginBottom: 16 }} />
        <Skeleton style={{ width: '100%', height: 300 }} />
      </div>
    </div>
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>💰 Ventas</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-[11px] font-semibold px-3 py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>+ Nueva</button>
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex gap-3 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="card flex-1 p-3">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Ventas</p>
            <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{records.length}</p>
          </div>
          <div className="card flex-1 p-3">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Ingresos</p>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-emerald)' }}>{fmtEuro(totalRevenue)}</p>
          </div>
          <div className="card flex-1 p-3">
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Margen</p>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-blue)' }}>{fmtEuro(totalMargin)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '75ms' }}>
          <div className="flex gap-1">
            <button onClick={() => setVista('tabla')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'tabla' ? 'var(--bg-pill)' : 'transparent', color: vista === 'tabla' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📋 Tabla</button>
            <button onClick={() => setVista('kanban')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'kanban' ? 'var(--bg-pill)' : 'transparent', color: vista === 'kanban' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📊 Kanban</button>
          </div>
          <select value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)} className="text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los vendedores</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>

        {vista === 'kanban' ? (
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {[['Vendido', '✅'], ['Financiado', '💰']].map(([label, icon]) => {
              const items = label === 'Financiado' ? records.filter(r => r.financiada) : records.filter(r => !r.financiada)
              return (
                <div key={label} className="pipeline-column p-3" style={{ minWidth: 220, flex: 1, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                  <div className="flex items-center gap-1.5 mb-2 shrink-0">
                    <span className="text-xs">{icon}</span>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{label}</h3>
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{items.length}</span>
                  </div>
                  <div className="space-y-1.5 overflow-y-auto flex-1">
                    {items.length === 0 ? <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                    : items.map(item => (
                      <button key={item.id} onClick={() => setSelected(item)} className="vehicle-card w-full text-left p-2 cursor-pointer">
                        <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
                        <div className="text-[10px] mt-0.5 flex flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
                          {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
                          {item.precioVenta && <span>{fmtEuro(item.precioVenta)}</span>}
                          {item.vendedorNombre && <span>👤 {item.vendedorNombre}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card overflow-hidden rounded-xl animate-fade-up" style={{ background: 'var(--bg-card)' }}>
            {records.length === 0 ? <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin ventas</p></div> : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-pill)' }}>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Venta</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Vehículo</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Precio</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Margen</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Vendedor</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Pago</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => setSelected(r)}
                      className="cursor-pointer transition-all hover:brightness-95"
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-pill)' }}>
                      <td className="p-3 font-medium" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text)' }}>{fmtEuro(r.precioVenta)}</td>
                      <td className="text-right p-3" style={{ color: r.margenBruto && r.margenBruto > 0 ? 'var(--accent-emerald)' : 'var(--error)' }}>{fmtEuro(r.margenBruto)}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.vendedorNombre || '-'}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.clienteNombre || '-'}</td>
                      <td className="p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: r.financiada ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)',
                        color: r.financiada ? '#3b82f6' : '#22c55e',
                      }}>{r.financiada ? '💰 Financiada' : r.formaPago || 'Contado'}</span></td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaVenta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.nombre}</h2>
                <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Cliente:</span>
                  <input value={selected.clienteNombre} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, clienteNombre: e.target.value } : r))} style={selectSx} placeholder="Nombre cliente" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Contacto:</span>
                  <input value={selected.clienteContacto} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, clienteContacto: e.target.value } : r))} style={selectSx} placeholder="Teléfono/email" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Precio venta:</span>
                  <input type="number" value={selected.precioVenta ?? ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, precioVenta: e.target.value ? parseFloat(e.target.value) : null } : r))} style={selectSx} step="0.01" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Precio compra:</span>
                  <span style={{ color: 'var(--text)' }}>{fmtEuro(selected.precioCompra)}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Margen:</span>
                  <span style={{ color: selected.margenBruto && selected.margenBruto > 0 ? 'var(--accent-emerald)' : 'var(--error)' }}>{selected.margenBruto != null ? `${fmtEuro(selected.margenBruto)} (${selected.margenPorcentaje?.toFixed(1)}%)` : '-'}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Forma pago:</span>
                  <select value={selected.formaPago} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, formaPago: e.target.value } : r))} style={selectSx}>
                    <option value="">Seleccionar</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Financiación">Financiación</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Financiada:</span>
                  <input type="checkbox" checked={selected.financiada} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, financiada: e.target.checked } : r))} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Vendedor:</span>
                  <span style={{ color: 'var(--text)' }}>{selected.vendedorNombre || '-'}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Fecha venta:</span>
                  <span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaVenta)}</span>
                </div>
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
                  <textarea value={selected.observaciones} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, observaciones: e.target.value } : r))} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={async () => {
                  await fetch(`/api/ventas-admin/${selected.id}` + "?token=" + new URLSearchParams(window.location.search).get("token"), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ precioVenta: selected.precioVenta, clienteNombre: selected.clienteNombre, clienteContacto: selected.clienteContacto, formaPago: selected.formaPago, financiada: selected.financiada, observaciones: selected.observaciones }) })
                }} className="w-full text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
                <button onClick={async () => {
                  setConfirmDelete(selected.id)
                }} className="w-full text-[11px] font-semibold py-2 rounded mt-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await fetch('/api/ventas-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vehiculoId: createData.vehiculoId,
                  fechaVenta: createData.fechaVenta,
                  precioVenta: createData.precioVenta ? parseFloat(createData.precioVenta) : null,
                  vendedorId: createData.vendedorId || null,
                  clienteNombre: createData.clienteNombre,
                  clienteContacto: createData.clienteContacto,
                  formaPago: createData.formaPago,
                  observaciones: createData.observaciones,
                }),
              })
              setShowCreate(false)
              setCreateData({ vehiculoId: '', fechaVenta: '', precioVenta: '', vendedorId: '', clienteNombre: '', clienteContacto: '', formaPago: '', observaciones: '' })
              fetchData()
            }} className="card w-full max-w-md animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nueva venta</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo *</p>
                  <VehicleAutocomplete vehicles={vehicles} value={createData.vehiculoId} onChange={(id) => setCreateData(p => ({ ...p, vehiculoId: id }))} required placeholder="Buscar vehículo..." />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha de venta *</p>
                  <input type="date" value={createData.fechaVenta} onChange={e => setCreateData(p => ({ ...p, fechaVenta: e.target.value }))} required style={selectSx} />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Precio de venta (€)</p>
                  <input type="number" value={createData.precioVenta} onChange={e => setCreateData(p => ({ ...p, precioVenta: e.target.value }))} style={selectSx} step="0.01" />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vendedor</p>
                  <SearchableSelect items={employees} value={createData.vendedorId || ''} onChange={(id) => setCreateData(p => ({ ...p, vendedorId: id }))} placeholder="Buscar empleado..." displayFn={(e: any) => e.name} />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Nombre del cliente</p>
                  <input type="text" value={createData.clienteNombre} onChange={e => setCreateData(p => ({ ...p, clienteNombre: e.target.value }))} style={selectSx} placeholder="Opcional" />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Contacto del cliente</p>
                  <input type="text" value={createData.clienteContacto} onChange={e => setCreateData(p => ({ ...p, clienteContacto: e.target.value }))} style={selectSx} placeholder="Opcional" />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Forma de pago</p>
                  <select value={createData.formaPago} onChange={e => setCreateData(p => ({ ...p, formaPago: e.target.value }))} style={selectSx}>
                    <option value="">Sin seleccionar</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Financiación">Financiación</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones</p>
                  <textarea value={createData.observaciones} onChange={e => setCreateData(p => ({ ...p, observaciones: e.target.value }))} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} placeholder="Opcional" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button type="submit" className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>Crear</button>
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}>Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>

  )
}

const selectSx: React.CSSProperties = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

export default function VentasAdminPage() {
  return <ThemeProvider><VentasAdminInner /></ThemeProvider>
}
