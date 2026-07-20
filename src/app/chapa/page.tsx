'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'
import { stateColor } from '@/lib/colors'
import VehicleAutocomplete from '@/components/vehicle-autocomplete'
import SearchableSelect from '@/components/searchable-select'

interface ChapaItem {
  id: string; matricula: string; vehiculoId: string | null; vehiculoNombre: string | null
  estado: string; proveedorId: string | null; proveedorNombre: string | null; costeTotal: number | null
  fechaSalida: string | null; fechaRetorno: string | null
  trabajosSolicitados: string; observaciones: string; diasFuera: number | null
}

const ESTADOS = ['', 'En taller', 'Terminado', 'Pendiente de Chapa']
const ESTADO_ICONS: Record<string, string> = { '': '—', 'En taller': '🔧', 'Terminado': '✅', 'Pendiente de Chapa': '⏳' }

function fmtEuro(n: number | null) { return n != null ? n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '-' }

function vehicleDisplay(v: any, id: string | null): string {
  if (!id) return '🚗 Sin vehículo'
  const veh = v.find((x: any) => x.id === id)
  if (!veh) return '🚗 Sin vehículo'
  return `${veh.name} — ${veh.brand} ${veh.model} (${veh.year || '—'})`
}

function ChapaInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<ChapaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<ChapaItem | null>(null)
  const [editObs, setEditObs] = useState('')
  const [editTrabajos, setEditTrabajos] = useState('')
  const [editing, setEditing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [providers, setProviders] = useState<{ id: string; name: string }[]>([])
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string }[]>([])
  const [createData, setCreateData] = useState({ vehiculoId: '', estado: 'Pendiente de Chapa', proveedorId: '', costeTotal: '', fechaSalida: '', fechaRetorno: '', trabajosSolicitados: '', observaciones: '' })

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const [res, empRes, vehRes, provRes] = await Promise.all([
        fetch(`/api/chapa${params.toString() ? '?' + params : ''}`),
        fetch('/api/employees'),
        fetch('/api/vehicles?list=true'),
        fetch('/api/providers'),
      ])
      const json = await res.json()
      const empJson = await empRes.json()
      const vehJson = await vehRes.json()
      const provJson = await provRes.json()
      if (json.success) setRecords(json.data)
      if (empJson.success) setEmployees(empJson.data)
      if (vehJson.success) setVehicles(vehJson.data)
      if (provJson.success) setProviders(provJson.data)
    } catch {} finally { setLoading(false) }
  }, [filterEstado])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = ESTADOS.filter(Boolean).map(est => ({ estado: est, items: records.filter(r => r.estado === est) }))

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const record = records.find(r => r.id === active.id)
    if (!record) return
    const newEstado = over.id as string
    if (newEstado === record.estado) return
    setRecords(prev => prev.map(r => r.id === record.id ? { ...r, estado: newEstado } : r))
    fetch(`/api/chapa/${record.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: newEstado }) }).catch(() => {})
  }

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
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos</option>
            {ESTADOS.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{records.length} registros</span>
        </div>

        {vista === 'kanban' ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up" style={{ animationDelay: '75ms' }}>
            {columns.map(col => (
              <DroppableColumn key={col.estado} id={col.estado}>
                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                  <span className="text-xs">{ESTADO_ICONS[col.estado]}</span>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{col.estado}</h3>
                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{col.items.length}</span>
                </div>
                <div className="space-y-1.5 overflow-y-auto flex-1">
                  {col.items.length === 0 ? <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                  : col.items.map(item => (
                    <DraggableChapaCard key={item.id} item={item} vehicles={vehicles} onClick={() => { setSelected(item); setEditObs(item.observaciones); setEditTrabajos(item.trabajosSolicitados) }} />
                  ))}
                </div>
              </DroppableColumn>
            ))}
          </div>
          </DndContext>
        ) : (
          <div className="card overflow-hidden rounded-xl animate-fade-up" style={{ background: 'var(--bg-card)' }}>
            {records.length === 0 ? <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div> : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-pill)' }}>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Vehículo</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Proveedor</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Coste</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Salida</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Retorno</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Días</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditObs(r.observaciones); setEditTrabajos(r.trabajosSolicitados) }}
                      className="cursor-pointer transition-all hover:brightness-95"
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-pill)' }}>
                      <td className="p-3 font-medium" style={{ color: 'var(--text)' }}>{vehicleDisplay(vehicles, r.vehiculoId)}</td>
                      <td className="p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: stateColor(r.estado).bg,
                        color: stateColor(r.estado).text,
                        whiteSpace: 'nowrap',
                      }}>{r.estado || 'Sin estado'}</span></td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.proveedorNombre || '-'}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text)' }}>{fmtEuro(r.costeTotal)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaSalida)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaRetorno)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{r.diasFuera ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {selected && !editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{vehicleDisplay(vehicles, selected.vehiculoId)}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(true)} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
                  <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Estado:</span><span style={{ color: 'var(--text)' }}>{selected.estado || 'Sin estado'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Proveedor:</span><span style={{ color: 'var(--text)' }}>{selected.proveedorNombre || '—'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Coste total:</span><span style={{ color: 'var(--text)' }}>{selected.costeTotal != null ? selected.costeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' }) : '—'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Salida:</span><span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaSalida)}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Retorno:</span><span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaRetorno)}</span></div>
                {selected.diasFuera != null && <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Días fuera:</span><span style={{ color: 'var(--text)' }}>{selected.diasFuera}</span></div>}
                {selected.trabajosSolicitados && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Trabajos solicitados:</p><p style={{ color: 'var(--text-secondary)' }}>{selected.trabajosSolicitados}</p></div>}
                {selected.observaciones && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones:</p><p style={{ color: 'var(--text-secondary)' }}>{selected.observaciones}</p></div>}
              </div>
              <button onClick={async () => {
                if (!confirm('¿Eliminar este registro?')) return
                try {
                  const r = await fetch(`/api/chapa/${selected.id}`, { method: 'DELETE' })
                  if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                  setSelected(null); fetchData()
                } catch (e) { alert('Error de red al eliminar'); }
              }} className="w-full text-[11px] font-semibold py-2 rounded mt-4" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
            </div>
          </div>
        )}

        {selected && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setEditing(false) } }}>
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✏️ {vehicleDisplay(vehicles, selected.vehiculoId)}</h2>
                <button onClick={() => setEditing(false)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Estado:</span>
                  <select value={selected.estado} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, estado: e.target.value } : r))} style={selectSx}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s || 'Sin estado'}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Proveedor:</span>
                  <span style={{ color: 'var(--text)' }}>{selected.proveedorNombre || '-'}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Coste total:</span>
                  <input type="number" value={selected.costeTotal ?? ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, costeTotal: e.target.value ? parseFloat(e.target.value) : null } : r))} style={selectSx} step="0.01" />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Salida:</span>
                  <input type="date" value={selected.fechaSalida?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaSalida: e.target.value || null } : r))} style={selectSx} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Retorno:</span>
                  <input type="date" value={selected.fechaRetorno?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaRetorno: e.target.value || null } : r))} style={selectSx} />
                </div>
                {selected.diasFuera != null && (
                  <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Días fuera:</span><span style={{ color: 'var(--text)' }}>{selected.diasFuera}</span></div>
                )}
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Trabajos solicitados:</p>
                  <textarea value={editTrabajos} onChange={e => setEditTrabajos(e.target.value)} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                </div>
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={async () => {
                  await fetch(`/api/chapa/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: selected.estado, costeTotal: selected.costeTotal, fechaSalida: selected.fechaSalida, fechaRetorno: selected.fechaRetorno, trabajosSolicitados: editTrabajos, observaciones: editObs }) })
                  setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, observaciones: editObs, trabajosSolicitados: editTrabajos } : r))
                }} className="w-full text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
                <button onClick={async () => {
                  if (!confirm('¿Eliminar este registro?')) return
                  try {
                    const r = await fetch(`/api/chapa/${selected.id}`, { method: 'DELETE' })
                    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                    setSelected(null); setEditing(false); fetchData()
                  } catch (e) { alert('Error de red al eliminar'); }
                }} className="w-full text-[11px] font-semibold py-2 rounded mt-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const selectSx: React.CSSProperties = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '60vh', outline: isOver ? '2px solid var(--accent-blue)' : 'none', outlineOffset: -2 }}>
      {children}
    </div>
  )
}

function DraggableChapaCard({ item, vehicles, onClick }: { item: ChapaItem; vehicles: any[]; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  const display = item.vehiculoId ? vehicleDisplay(vehicles, item.vehiculoId) : (item.matricula || 'Sin vehículo')
  return (
    <button ref={setNodeRef} style={{ ...style, borderLeft: `3px solid ${stateColor(item.estado).text}` }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing p-2.5 transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{display}</p>
      <div className="text-[10px] mt-0.5 flex flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
        {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
        {item.costeTotal != null && <span>{item.costeTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
        {item.diasFuera != null && <span>📅 {item.diasFuera}d</span>}
      </div>
    </button>
  )
}

export default function ChapaPage() {
  return <ThemeProvider><ChapaInner /></ThemeProvider>
}
