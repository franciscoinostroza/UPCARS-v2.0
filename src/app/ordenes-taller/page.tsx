'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import CalendarView from '@/components/calendar-view'
import { fmtDate } from '@/lib/dates'

interface TallerItem {
  id: string
  nombre: string
  vehicleId: string | null
  vehiculoNombre: string | null
  responsableId: string | null
  responsableNombre: string | null
  tipo: string
  estado: string
  fechaEntrada: string | null
  fechaSalida: string | null
  observaciones: string
  costeMateriales: number | null
  costeManoObra: number | null
  costeTotal: number | null
  diasTaller: number | null
}

const ESTADOS = ['', 'En proceso', 'Terminado', 'Bloqueado']
const ESTADO_ICONS: Record<string, string> = { '': '—', 'En proceso': '🔧', 'Terminado': '✅', 'Bloqueado': '🚫' }



function TallerInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<TallerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban' | 'calendario'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<TallerItem | null>(null)
  const [editObs, setEditObs] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string }[]>([])
  const [createData, setCreateData] = useState({ vehicleId: '', mecanicoId: '', notes: '', tipoTrabajo: '', fechaEntrada: '' })

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const [res, empRes, vehRes] = await Promise.all([
        fetch(`/api/ordenes-taller${params.toString() ? '?' + params : ''}`),
        fetch('/api/employees'),
        fetch('/api/vehicles?list=true'),
      ])
      const json = await res.json()
      const empJson = await empRes.json()
      const vehJson = await vehRes.json()
      if (json.success) setRecords(json.data)
      if (empJson.success) setEmployees(empJson.data)
      if (vehJson.success) setVehicles(vehJson.data)
    } catch {} finally {
      setLoading(false)
    }
  }, [filterEstado])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = ESTADOS.map(est => ({ estado: est, items: records.filter(r => r.estado === est) }))

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
          <Skeleton style={{ width: 200, height: 22, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 300 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-end mb-4 animate-fade-up">
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-[11px] font-semibold px-3 py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>+ Nueva</button>
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="flex gap-1">
            <button onClick={() => setVista('tabla')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'tabla' ? 'var(--bg-pill)' : 'transparent', color: vista === 'tabla' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📋 Tabla</button>
            <button onClick={() => setVista('kanban')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'kanban' ? 'var(--bg-pill)' : 'transparent', color: vista === 'kanban' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📊 Kanban</button>
            <button onClick={() => setVista('calendario')} className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'calendario' ? 'var(--bg-pill)' : 'transparent', color: vista === 'calendario' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📅 Calendario</button>
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {vista === 'kanban' ? (
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '75ms' }}>
            {columns.map(col => (
              <div key={col.estado} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <span className="text-xs">{ESTADO_ICONS[col.estado]}</span>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{col.estado}</h3>
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{col.items.length}</span>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {col.items.length === 0 ? <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                  : col.items.map(item => (
                    <button key={item.id} onClick={() => { setSelected(item); setEditObs(item.observaciones) }} className="vehicle-card w-full text-left p-2 cursor-pointer">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
                      <div className="text-[10px] mt-0.5 flex flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
                        {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
                        {item.responsableNombre && <span>👤 {item.responsableNombre}</span>}
                        {item.fechaEntrada && <span>📅 {fmtDate(item.fechaEntrada)}</span>}
                      </div>
                      <a href={`https://www.notion.so/${item.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] mt-1 inline-block" style={{ color: 'var(--accent-blue)' }}>🔗</a>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : vista === 'calendario' ? (
          <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <CalendarView
              items={records.filter(r => r.fechaEntrada).map(r => ({ id: r.id, titulo: `${r.nombre}${r.vehiculoNombre ? ' — ' + r.vehiculoNombre : ''}`, fecha: r.fechaEntrada!, estado: r.estado, area: r.tipo }))}
              typeColors={{ 'En proceso': '#3b82f6', 'Terminado': '#22c55e', 'Bloqueado': '#ef4444' }}
            />
          </div>
        ) : (
          <div className="card overflow-x-auto animate-fade-up" style={{ animationDelay: '75ms' }}>
            {records.length === 0 ? <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div>
            : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">Orden</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Vehículo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Tipo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Mecánico</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Entrada</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditObs(r.observaciones) }} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover:opacity-80">
                      <td className="p-2 sm:p-3 font-medium truncate max-w-[120px]" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-2 sm:p-3 truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.tipo || '-'}</td>
                      <td className="p-2 sm:p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: !r.estado ? 'rgba(156,163,175,0.12)' : r.estado === 'Terminado' ? 'rgba(34,197,94,0.12)' : r.estado === 'Bloqueado' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',

                        color: !r.estado ? '#9ca3af' : r.estado === 'Terminado' ? '#22c55e' : r.estado === 'Bloqueado' ? '#ef4444' : '#3b82f6',
                      }}>{r.estado || 'Sin estado'}</span></td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.responsableNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaEntrada)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaSalida)}</td>
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
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Estado:</span>
                  <select value={selected.estado} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, estado: e.target.value } : r))} style={selectSx}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Mecánico:</span>
                  <select value={selected.responsableId || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, responsableId: e.target.value || null, responsableNombre: e.target.value ? (employees.find(emp => emp.id === e.target.value)?.name || null) : null } : r))} style={selectSx}>
                    <option value="">Sin asignar</option>
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Tipo:</span>
                  <input value={selected.tipo} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, tipo: e.target.value } : r))} style={selectSx} placeholder="Tipo de trabajo" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Entrada:</span>
                  <input type="date" value={selected.fechaEntrada?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaEntrada: e.target.value || null } : r))} style={selectSx} />
                </div>
                <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-2 text-[10px]" style={{ borderColor: 'var(--border)' }}>
                  {selected.costeMateriales != null && <div><span style={{ color: 'var(--text-muted)' }}>Coste materiales:</span> <span style={{ color: 'var(--text)' }}>{selected.costeMateriales.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>}
                  {selected.costeManoObra != null && <div><span style={{ color: 'var(--text-muted)' }}>Coste mano obra:</span> <span style={{ color: 'var(--text)' }}>{selected.costeManoObra.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>}
                  {selected.costeTotal != null && <div><span style={{ color: 'var(--text-muted)' }}>Coste total:</span> <span style={{ color: 'var(--accent-blue)' }}>{selected.costeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span></div>}
                  {selected.diasTaller != null && <div><span style={{ color: 'var(--text-muted)' }}>Días en taller:</span> <span style={{ color: 'var(--text)' }}>{selected.diasTaller}</span></div>}
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={3} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={async () => {
                  await fetch(`/api/ordenes-taller/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: selected.estado, observaciones: editObs }) })
                  setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, observaciones: editObs } : r))
                }} className="w-full text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
              </div>
              <a href={`https://www.notion.so/${selected.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-[10px] font-medium py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)' }}>🔗 Abrir en Notion</a>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await fetch('/api/workshop/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Taller', vehicleId: createData.vehicleId, mecanicoId: createData.mecanicoId, notes: createData.notes, tipoTrabajo: createData.tipoTrabajo, fechaEntrada: createData.fechaEntrada }),
              })
              setShowCreate(false)
              setCreateData({ vehicleId: '', mecanicoId: '', notes: '', tipoTrabajo: '', fechaEntrada: '' })
              fetchData()
            }} className="card w-full max-w-md animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nueva orden de Taller</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo *</p>
                  <select value={createData.vehicleId} onChange={e => setCreateData(p => ({ ...p, vehicleId: e.target.value }))} required style={selectSx}>
                    <option value="">Seleccionar vehículo</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.matricula || v.name} - {v.brand} {v.model}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Mecánico</p>
                  <select value={createData.mecanicoId} onChange={e => setCreateData(p => ({ ...p, mecanicoId: e.target.value }))} style={selectSx}>
                    <option value="">Sin asignar</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Tipo de trabajo</p>
                  <select value={createData.tipoTrabajo} onChange={e => setCreateData(p => ({ ...p, tipoTrabajo: e.target.value }))} style={selectSx}>
                    <option value="">Sin tipo</option>
                    <option value="Revisión general">Revisión general</option>
                    <option value="Frenos">Frenos</option>
                    <option value="Motor">Motor</option>
                    <option value="Electricidad">Electricidad</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha entrada</p>
                  <input type="date" value={createData.fechaEntrada} onChange={e => setCreateData(p => ({ ...p, fechaEntrada: e.target.value }))} style={selectSx} />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones</p>
                  <textarea value={createData.notes} onChange={e => setCreateData(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} placeholder="Opcional" />
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

export default function TallerPage() {
  return (
    <ThemeProvider>
      <TallerInner />
    </ThemeProvider>
  )
}
