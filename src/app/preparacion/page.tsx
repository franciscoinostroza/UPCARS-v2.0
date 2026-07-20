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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [vehiculoId, setVehiculoId] = useState('')
  const [preparadorId, setPreparadorId] = useState('')
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
          <div className="card overflow-hidden rounded-xl animate-fade-up" style={{ background: 'var(--bg-card)' }}>
            {records.length === 0 ? <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div> : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-pill)' }}>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>ID</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Vehículo</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Tipo limpieza</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Preparador</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Inicio</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fin</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditObs(r.observaciones) }}
                      className="cursor-pointer transition-all hover:brightness-95"
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-pill)' }}>
                      <td className="p-3 font-medium" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: stateColor(r.estado).bg,
                        color: stateColor(r.estado).text,
                        whiteSpace: 'nowrap',
                      }}>{r.estado || 'Sin estado'}</span></td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.tipoLimpieza || '-'}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.preparadorNombre || '-'}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaInicio)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaFin)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{r.horasInvertidas ?? '-'}</td>
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
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.nombre}</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(true)} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
                  <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Estado:</span><span style={{ color: 'var(--text)' }}>{selected.estado || 'Sin estado'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Vehículo:</span><span style={{ color: 'var(--text)' }}>{selected.vehiculoNombre || '—'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Tipo limpieza:</span><span style={{ color: 'var(--text)' }}>{selected.tipoLimpieza || '—'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Preparador:</span><span style={{ color: 'var(--text)' }}>{selected.preparadorNombre || '—'}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Inicio:</span><span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaInicio)}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Fin:</span><span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaFin)}</span></div>
                <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Entrega:</span><span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaEntrega)}</span></div>
                {selected.horasInvertidas != null && <div className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Horas invertidas:</span><span style={{ color: 'var(--text)' }}>{selected.horasInvertidas}h</span></div>}
                <div className="flex flex-wrap gap-3 mt-1">
                  <span style={{ color: selected.limpiezaInterior ? '#22c55e' : 'var(--text-muted)' }}>{selected.limpiezaInterior ? '✅ Interior' : '⬜ Interior'}</span>
                  <span style={{ color: selected.limpiezaExterior ? '#22c55e' : 'var(--text-muted)' }}>{selected.limpiezaExterior ? '✅ Exterior' : '⬜ Exterior'}</span>
                  <span style={{ color: selected.fotografiaAnuncio ? '#22c55e' : 'var(--text-muted)' }}>{selected.fotografiaAnuncio ? '📸 Foto ✅' : '📸 Foto'}</span>
                  <span style={{ color: selected.registrarInicio ? '#22c55e' : 'var(--text-muted)' }}>{selected.registrarInicio ? '🟢 Inicio ✅' : '🟢 Inicio'}</span>
                  <span style={{ color: selected.registrarFin ? '#22c55e' : 'var(--text-muted)' }}>{selected.registrarFin ? '🔴 Fin ✅' : '🔴 Fin'}</span>
                </div>
                {selected.observaciones && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones:</p><p style={{ color: 'var(--text-secondary)' }}>{selected.observaciones}</p></div>}
              </div>
              <button onClick={async () => {
                if (!confirm('¿Eliminar este registro?')) return
                try {
                  const r = await fetch(`/api/preparacion/${selected.id}` + "?token=" + new URLSearchParams(window.location.search).get("token"), { method: 'DELETE' })
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
                      <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✏️ {selected.nombre}</h2>
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
                        {[
                          ['Interior', 'limpiezaInterior'],
                          ['Exterior', 'limpiezaExterior'],
                          ['📸 Foto anuncio', 'fotografiaAnuncio'],
                          ['🟢 Registrar inicio', 'registrarInicio'],
                          ['🔴 Registrar fin', 'registrarFin'],
                        ].map(([label, key]) => {
                          const checked = (selected as any)[key]
                          return (
                            <label key={key} className="flex items-center gap-2 text-[11px] cursor-pointer select-none"
                              style={{ color: checked ? 'var(--text)' : 'var(--text-muted)' }}>
                              <span onClick={(e) => {
                                e.stopPropagation()
                                const newVal = !checked
                                const tk = new URLSearchParams(window.location.search).get('token') || ''
                                setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, [key]: newVal } as PrepItem : r))
                                setSelected(prev => prev ? { ...prev, [key]: newVal } : null)
                                fetch(`/api/preparacion/${selected.id}?token=${tk}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: newVal }) }).catch(() => {})
                              }} style={{
                                width: 36, height: 20, borderRadius: 10, display: 'inline-flex', alignItems: 'center',
                                padding: 2, cursor: 'pointer', transition: 'background 0.2s',
                                background: checked ? '#22c55e' : 'var(--border)',
                              }}>
                                <span style={{
                                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                  transition: 'transform 0.2s',
                                  transform: checked ? 'translateX(16px)' : 'translateX(0)',
                                }} />
                              </span>
                              {label}
                            </label>
                          )
                        })}
                      </div>
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
                        <textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                      </div>
                      <button onClick={async () => {
                        await fetch(`/api/preparacion/${selected.id}` + "?token=" + new URLSearchParams(window.location.search).get("token"), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: selected.estado, tipoLimpieza: selected.tipoLimpieza, fechaInicio: selected.fechaInicio, fechaFin: selected.fechaFin, fechaEntrega: selected.fechaEntrega, observaciones: editObs }) })
                        setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, observaciones: editObs } : r))
                      }} className="w-full text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar'}</button>
                      <button onClick={async () => {
                        if (!confirm('¿Eliminar este registro?')) return
                        try {
                          const r = await fetch(`/api/preparacion/${selected.id}` + "?token=" + new URLSearchParams(window.location.search).get("token"), { method: 'DELETE' })
                          if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                          setSelected(null); setEditing(false); fetchData()
                        } catch (e) { alert('Error de red al eliminar'); }
                      }} className="w-full text-[11px] font-semibold py-2 rounded mt-1" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
                    </div>
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
                    vehiculoId: vehiculoId || undefined,
                    estado: fd.get('estado') || 'Pendiente',
                    preparadorId: preparadorId || undefined,
                    tipoLimpieza: fd.get('tipoLimpieza') || undefined,
                    fechaInicio: fd.get('fechaInicio') || undefined,
                    fechaFin: fd.get('fechaFin') || undefined,
                    fechaEntrega: fd.get('fechaEntrega') || undefined,
                    observaciones: fd.get('observaciones') || '',
                  }),
                })
                setShowCreate(false)
                setVehiculoId('')
                setPreparadorId('')
                fetchData()
              }} className="space-y-3">
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Nombre *</p>
                  <input name="nombre" required style={selectSx} placeholder="Ej: PREP - Toyota" />
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo</p>
                  <VehicleAutocomplete vehicles={vehicles} value={vehiculoId} onChange={setVehiculoId} placeholder="Buscar vehículo..." />
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
                    <SearchableSelect items={employees} value={preparadorId} onChange={setPreparadorId} placeholder="Buscar empleado..." displayFn={(e: any) => e.name} />
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

const selectSx = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

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
