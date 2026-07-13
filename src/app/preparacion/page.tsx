'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'

interface PrepItem {
  id: string; nombre: string; vehiculoId: string | null; vehiculoNombre: string | null
  estado: string; preparadorId: string | null; preparadorNombre: string | null
  tipoLimpieza: string; fechaInicio: string | null; fechaFin: string | null; fechaEntrega: string | null
  horasInvertidas: number | null; limpiezaInterior: boolean; limpiezaExterior: boolean
  fotografiaAnuncio: boolean; registrarInicio: boolean; registrarFin: boolean; observaciones: string
}

const ESTADOS = ['', 'Pendiente', 'En preparación', 'Listo para stock']
const ESTADO_ICONS: Record<string, string> = { '': '—', 'Pendiente': '⏳', 'En preparación': '🔧', 'Listo para stock': '✅' }

function PrepInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<PrepItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<PrepItem | null>(null)
  const [editObs, setEditObs] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string }[]>([])

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const [res, empRes, vehRes] = await Promise.all([
        fetch(`/api/preparacion${params.toString() ? '?' + params : ''}`),
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
    fetch(`/api/preparacion/${record.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: newEstado }) }).catch(() => {})
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
                    <DraggablePrepCard key={item.id} item={item} onClick={() => { setSelected(item); setEditObs(item.observaciones) }} />
                  ))}
                </div>
              </DroppableColumn>
            ))}
          </div>
          </DndContext>
        ) : (
          <div className="card overflow-x-auto animate-fade-up" style={{ animationDelay: '75ms' }}>
            {records.length === 0 ? <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div> : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">ID</th><th className="text-left p-2 sm:p-3 font-medium">Vehículo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th><th className="text-left p-2 sm:p-3 font-medium">Tipo limpieza</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Preparador</th><th className="text-right p-2 sm:p-3 font-medium">Inicio</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fin</th><th className="text-right p-2 sm:p-3 font-medium">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditObs(r.observaciones) }} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover:opacity-80">
                      <td className="p-2 sm:p-3 font-medium truncate max-w-[80px]" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-2 sm:p-3 truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="p-2 sm:p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: !r.estado ? 'rgba(156,163,175,0.12)' : r.estado === 'Listo para stock' ? 'rgba(34,197,94,0.12)' : r.estado === 'En preparación' ? 'rgba(59,130,246,0.12)' : 'rgba(234,179,8,0.12)',
                        color: !r.estado ? '#9ca3af' : r.estado === 'Listo para stock' ? '#22c55e' : r.estado === 'En preparación' ? '#3b82f6' : '#eab308',
                        whiteSpace: 'nowrap',
                      }}>{r.estado || 'Sin estado'}</span></td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.tipoLimpieza || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.preparadorNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaInicio)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaFin)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.horasInvertidas ?? '-'}</td>
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
                    {ESTADOS.map(s => <option key={s} value={s}>{s || 'Sin estado'}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Tipo limpieza:</span>
                  <select value={selected.tipoLimpieza} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, tipoLimpieza: e.target.value } : r))} style={selectSx}>
                    <option value="">Sin tipo</option>
                    <option value="Entrega cliente">Entrega cliente</option>
                    <option value="Exposición">Exposición</option>
                    <option value="Lavado Taller">Lavado Taller</option>
                    <option value="Repaso - Visita cte.">Repaso - Visita cte.</option>
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Inicio:</span>
                  <input type="date" value={selected.fechaInicio?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaInicio: e.target.value || null } : r))} style={selectSx} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Fin:</span>
                  <input type="date" value={selected.fechaFin?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaFin: e.target.value || null } : r))} style={selectSx} />
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Entrega:</span>
                  <input type="date" value={selected.fechaEntrega?.split('T')[0] || ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fechaEntrega: e.target.value || null } : r))} style={selectSx} />
                </div>
                {selected.horasInvertidas != null && (
                  <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Horas invertidas:</span><span style={{ color: 'var(--text)' }}>{selected.horasInvertidas}h</span></div>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.limpiezaInterior} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, limpiezaInterior: e.target.checked } : r))} />
                    Interior
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.limpiezaExterior} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, limpiezaExterior: e.target.checked } : r))} />
                    Exterior
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.fotografiaAnuncio} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, fotografiaAnuncio: e.target.checked } : r))} />
                    📸 Foto anuncio
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.registrarInicio} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, registrarInicio: e.target.checked } : r))} />
                    🟢 Registrar inicio
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.registrarFin} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, registrarFin: e.target.checked } : r))} />
                    🔴 Registrar fin
                  </label>
                </div>
                <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
                  <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                </div>
                <button onClick={async () => {
                  await fetch(`/api/preparacion/${selected.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: selected.estado, tipoLimpieza: selected.tipoLimpieza, fechaInicio: selected.fechaInicio, fechaFin: selected.fechaFin, fechaEntrega: selected.fechaEntrega, limpiezaInterior: selected.limpiezaInterior, limpiezaExterior: selected.limpiezaExterior, fotografiaAnuncio: selected.fotografiaAnuncio, registrarInicio: selected.registrarInicio, registrarFin: selected.registrarFin, observaciones: editObs }) })
                  setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, observaciones: editObs } : r))
                }} className="w-full text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
                <button onClick={async () => {
                  if (!confirm('¿Eliminar este registro de preparación?')) return
                  await fetch(`/api/preparacion/${selected.id}`, { method: 'DELETE' })
                  setSelected(null); fetchData()
                }} className="w-full text-[11px] font-semibold py-2 rounded mt-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
              </div>
              <a href={`https://www.notion.so/${selected.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-[10px] font-medium py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)' }}>🔗 Abrir en Notion</a>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <div className="card w-full max-w-md animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nuevo registro Preparación</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const form = e.target as HTMLFormElement
                const fd = new FormData(form)
                await fetch('/api/preparacion', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre: fd.get('nombre'),
                    vehiculoId: fd.get('vehiculoId') || undefined,
                    estado: fd.get('estado') || 'Pendiente',
                    preparadorId: fd.get('preparadorId') || undefined,
                    tipoLimpieza: fd.get('tipoLimpieza') || undefined,
                    fechaInicio: fd.get('fechaInicio') || undefined,
                    fechaFin: fd.get('fechaFin') || undefined,
                    fechaEntrega: fd.get('fechaEntrega') || undefined,
                    observaciones: fd.get('observaciones') || '',
                  }),
                })
                setShowCreate(false)
                fetchData()
              }} className="space-y-3">
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Nombre *</p>
                  <input name="nombre" required style={selectSx} placeholder="Ej: PREP - Toyota" />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo</p>
                  <select name="vehiculoId" style={selectSx}>
                    <option value="">Sin vehículo</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Estado</p>
                  <select name="estado" style={selectSx}>
                    {ESTADOS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Tipo de limpieza</p>
                  <select name="tipoLimpieza" style={selectSx}>
                    <option value="">Sin tipo</option>
                    <option value="Entrega cliente">Entrega cliente</option>
                    <option value="Exposición">Exposición</option>
                    <option value="Lavado Taller">Lavado Taller</option>
                    <option value="Repaso - Visita cte.">Repaso - Visita cte.</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Preparador</p>
                    <select name="preparadorId" style={selectSx}>
                      <option value="">Sin asignar</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha inicio</p>
                    <input name="fechaInicio" type="date" style={selectSx} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha fin</p>
                    <input name="fechaFin" type="date" style={selectSx} />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha entrega</p>
                    <input name="fechaEntrega" type="date" style={selectSx} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones</p>
                  <textarea name="observaciones" rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} placeholder="Opcional" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>Crear</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}>Cancelar</button>
                </div>
              </form>
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

function DraggablePrepCard({ item, onClick }: { item: PrepItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  return (
    <button ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
      <div className="text-[10px] mt-0.5 flex flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
        {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
        {item.tipoLimpieza && <span>🧹 {item.tipoLimpieza}</span>}
        {item.horasInvertidas != null && <span>⏱ {item.horasInvertidas}h</span>}
      </div>
    </button>
  )
}

export default function PrepPage() {
  return <ThemeProvider><PrepInner /></ThemeProvider>
}
