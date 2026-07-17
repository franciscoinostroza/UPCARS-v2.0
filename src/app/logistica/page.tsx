'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'
import { stateColor, priorityColor } from '@/lib/colors'
import CalendarView from '@/components/calendar-view'
import VehicleAutocomplete from '@/components/vehicle-autocomplete'

function vehLabel(v: any): string {
  return v.matricula ? v.matricula + ' - ' + v.brand + ' ' + v.model + ' (' + (v.year || '—') + ')' : v.name
}

interface LogItem {
  id: string
  nombre: string
  vehiculoId: string | null
  vehiculoNombre: string | null
  responsableId: string | null
  responsableNombre: string | null
  estado: string
  fechaProgramada: string | null
  fechaRealizada: string | null
  ubicacion: string
  situacionComercial: string
  prioridad: string
  observaciones: string
  authFileName: string | null
  authFileUrl: string | null
}

const ESTADOS = ['', 'Pendiente autorización', 'Autorizado', 'Completado', 'Bloqueado']
const ESTADO_ICONS: Record<string, string> = {
  '': '—', 'Pendiente autorización': '⏳', 'Autorizado': '📝', 'Completado': '✅', 'Bloqueado': '🚫',
}
const SITUACIONES = ['', 'Vendido', 'Exposición', 'Renting']
const PRIORIDADES = ['', 'Alta', 'Media', 'Baja']





const selectSx = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '60vh', outline: isOver ? '2px solid var(--accent-blue)' : 'none', outlineOffset: -2 }}>
      {children}
    </div>
  )
}

function DraggableLogCard({ item, onClick }: { item: LogItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  return (
    <button ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
      <div className="flex items-center gap-1 text-[10px] mt-0.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
        {item.ubicacion && <span>📍 {item.ubicacion}</span>}
        {item.responsableNombre && <span>👤 {item.responsableNombre}</span>}
        {item.prioridad && <span className="font-medium" style={{ color: item.prioridad === 'Alta' ? '#ef4444' : item.prioridad === 'Media' ? '#eab308' : 'var(--text-secondary)' }}>{item.prioridad}</span>}
      </div>
    </button>
  )
}

function LogisticaInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<LogItem[]>([])
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban' | 'calendario'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<LogItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})
  const [showCreate, setShowCreate] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const [logRes, empRes, vehRes] = await Promise.all([
        fetch(`/api/logistica${params.toString() ? '?' + params.toString() : ''}`),
        fetch('/api/employees'),
        fetch('/api/vehicles?list=true'),
      ])
      const logJson = await logRes.json()
      const empJson = await empRes.json()
      const vehJson = await vehRes.json()
      if (logJson.success) setRecords(logJson.data)
      if (empJson.success) setEmployees(empJson.data)
      if (vehJson.success) setVehicles(vehJson.data)
    } catch {} finally {
      setLoading(false)
    }
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
    fetch(`/api/logistica/${record.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: newEstado }) }).catch(() => {})
  }

  async function handleSaveEdit() {
    if (!selected) return
    try {
      const res = await fetch(`/api/logistica/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      if (res.ok) {
        setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, ...editData } as LogItem : r))
        setSelected(prev => prev ? { ...prev, ...editData } as LogItem : null)
        setEditing(false)
      }
    } catch {}
  }

  async function handleCreate(form: any) {
    try {
      const res = await fetch('/api/logistica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) { fetchData(); return true }
    } catch {}
    return false
  }

  function openEdit(item: LogItem) {
    setEditData({
      estado: item.estado,
      ubicacion: item.ubicacion,
      situacionComercial: item.situacionComercial,
      prioridad: item.prioridad,
      responsableId: item.responsableId || '',
      vehiculoId: item.vehiculoId || '',
      observaciones: item.observaciones,
    })
    setEditing(true)
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(true)} className="text-[10px] sm:text-xs px-2 py-1.5 rounded font-medium" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none' }}>➕ Nuevo</button>
            <DarkModeToggle />
          </div>
        </div>

        {/* Toggle + Filtros */}
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

        {/* Kanban */}
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
                    <DraggableLogCard key={item.id} item={item} onClick={() => { setSelected(item); setEditing(false) }} />
                  ))}
                </div>
              </DroppableColumn>
            ))}
          </div>
          </DndContext>
        ) : vista === 'calendario' ? (
          <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
            <CalendarView
              items={records.filter(r => r.fechaProgramada).map(r => ({ id: r.id, titulo: `${r.nombre}${r.vehiculoNombre ? ' — ' + r.vehiculoNombre : ''}`, fecha: r.fechaProgramada!, estado: r.estado, area: r.ubicacion }))}
              typeColors={{ 'Pendiente autorización': '#eab308', 'Autorizado': '#3b82f6', 'Completado': '#22c55e', 'Bloqueado': '#ef4444' }}
            />
          </div>
        ) : (
          /* Tabla */
          <div className="card overflow-hidden rounded-xl animate-fade-up" style={{ background: 'var(--bg-card)' }}>
            {records.length === 0 ? (
              <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div>
            ) : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-pill)' }}>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>ID</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Vehículo</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Ubicación</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Situación</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Prioridad</th>
                    <th className="text-left p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Responsable</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fecha prog.</th>
                    <th className="text-right p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Fecha real.</th>
                    <th className="text-center p-3 font-semibold text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>📎</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditing(false) }}
                      className="cursor-pointer transition-all hover:brightness-95"
                      style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-pill)' }}>
                      <td className="p-3 font-medium" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: stateColor(r.estado).bg,
                        color: stateColor(r.estado).text,
                        whiteSpace: 'nowrap',
                      }}>{r.estado || 'Sin estado'}</span></td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.ubicacion || '-'}</td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.situacionComercial || '-'}</td>
                      <td className="p-3"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: priorityColor(r.prioridad).bg, color: priorityColor(r.prioridad).text }}>{r.prioridad || '-'}</span></td>
                      <td className="p-3" style={{ color: 'var(--text-secondary)' }}>{r.responsableNombre || '-'}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaProgramada)}</td>
                      <td className="text-right p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaRealizada)}</td>
                      <td className="text-center p-3" style={{ color: r.authFileName ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{r.authFileName ? '📎' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal detalle / edición */}
        {selected && !editing && (
          <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} />
        )}
        {selected && editing && (
          <EditModal item={selected} editData={editData} setEditData={setEditData}
            employees={employees} vehicles={vehicles}
            onSave={handleSaveEdit} onCancel={() => setEditing(false)} />
        )}

        {showCreate && (
          <CreateModal employees={employees} vehicles={vehicles}
            onCreate={handleCreate} onClose={() => setShowCreate(false)} onRefresh={fetchData} />
        )}

      </div>
    </div>
  )
}

function DetailModal({ item, onClose, onEdit }: { item: LogItem; onClose: () => void; onEdit: () => void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.nombre}</h2>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
            <button onClick={async () => {
              if (!confirm('¿Eliminar este registro?')) return
              await fetch(`/api/logistica/${item.id}`, { method: 'DELETE' })
              window.location.reload()
            }} className="text-[10px] px-2 py-1 rounded" style={{ color: '#ef4444' }}>🗑</button>
            <button onClick={onClose} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>
        <div className="space-y-1.5 text-xs sm:text-sm mb-4">
          {[['Vehículo', item.vehiculoNombre], ['Estado', item.estado], ['Ubicación', item.ubicacion], ['Situación comercial', item.situacionComercial], ['Prioridad', item.prioridad], ['Responsable', item.responsableNombre],
            ['Fecha programada', fmtDate(item.fechaProgramada)], ['Fecha realizada', fmtDate(item.fechaRealizada)],
          ].map(([l, v]) => v ? <div key={l} className="flex gap-2"><span className="font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>{l}:</span><span style={{ color: 'var(--text)' }}>{v}</span></div> : null)}
          {item.authFileName && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>📎 Autorización de retirada</p>
              {item.authFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                <img src={item.authFileUrl} alt={item.authFileName} className="w-full rounded mt-1" style={{ maxHeight: 200, objectFit: 'contain' }} />
              ) : item.authFileUrl?.match(/\.pdf/i) ? (
                <iframe src={item.authFileUrl} className="w-full rounded mt-1" style={{ height: 200 }} />
              ) : null}
              {item.authFileUrl && <a href={item.authFileUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px] font-medium" style={{ color: 'var(--accent-blue)' }}>📥 {item.authFileName}</a>}
            </div>
          )}
          {item.observaciones && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Observaciones:</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{item.observaciones}</p>
            </div>
          )}
        </div>
        <a href={`https://www.notion.so/${item.id.replace(/-/g, '')}`} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-[10px] font-medium py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)' }}>🔗 Abrir en Notion</a>
      </div>
    </div>
  )
}

function EditModal({ item, editData, setEditData, employees, vehicles, onSave, onCancel }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✏️ Editar {item.nombre}</h2>
          <button onClick={onCancel} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Estado</p>
            <select value={editData.estado} onChange={e => setEditData({...editData, estado: e.target.value})} style={selectSx}>
              {ESTADOS.map(e => <option key={e} value={e}>{e || 'Sin estado'}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Ubicación</p>
            <input value={editData.ubicacion} onChange={e => setEditData({...editData, ubicacion: e.target.value})} placeholder="Ubicación" style={selectSx} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Situación comercial</p>
              <select value={editData.situacionComercial} onChange={e => setEditData({...editData, situacionComercial: e.target.value})} style={selectSx}>
                {SITUACIONES.map(s => <option key={s || 'v'} value={s}>{s || 'Sin situación'}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Prioridad</p>
              <select value={editData.prioridad} onChange={e => setEditData({...editData, prioridad: e.target.value})} style={selectSx}>
                {PRIORIDADES.map(p => <option key={p || 'v'} value={p}>{p || 'Sin prioridad'}</option>)}
              </select>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Responsable</p>
            <select value={editData.responsableId} onChange={e => setEditData({...editData, responsableId: e.target.value})} style={selectSx}>
              <option value="">Sin responsable</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo</p>
            <VehicleAutocomplete vehicles={vehicles} value={editData.vehiculoId || ''} onChange={(id) => setEditData({...editData, vehiculoId: id})} placeholder="Buscar vehículo..." />
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones</p>
            <textarea value={editData.observaciones} onChange={e => setEditData({...editData, observaciones: e.target.value})} placeholder="Opcional" rows={3} style={{...selectSx, resize: 'vertical'}} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onCancel} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}>Cancelar</button>
            <button onClick={onSave} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateModal({ employees, vehicles, onCreate, onClose, onRefresh }: { employees: any[]; vehicles: any[]; onCreate: (d: any) => Promise<boolean>; onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('')
  const [estado, setEstado] = useState('Pendiente autorización')
  const [ubicacion, setUbicacion] = useState('')
  const [sitCom, setSitCom] = useState('')
  const [prioridad, setPrioridad] = useState('')
  const [respId, setRespId] = useState('')
  const [vehId, setVehId] = useState('')
  const [fecha, setFecha] = useState('')
  const [obs, setObs] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const ok = await onCreate({ nombre: name.trim(), vehiculoId: vehId || undefined, responsableId: respId || undefined, estado, fechaProgramada: fecha || undefined, ubicacion: ubicacion.trim() || undefined, situacionComercial: sitCom || undefined, prioridad: prioridad || undefined, observaciones: obs.trim() || undefined })
    setSaving(false)
    if (ok) { onClose(); setName(''); setVehId(''); setRespId(''); setUbicacion(''); setObs(''); setSitCom(''); setPrioridad(''); setFecha('') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>➕ Nueva logística</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Nombre *</p>
            <input required placeholder="Ej: TRASLADO SEVILLA" value={name} onChange={e => setName(e.target.value)} style={selectSx} />
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Estado</p>
            <select value={estado} onChange={e => setEstado(e.target.value)} style={selectSx}>
              {ESTADOS.map(e => <option key={e} value={e}>{e || 'Sin estado'}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Fecha programada</p>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={selectSx} />
            </div>
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Ubicación</p>
              <input placeholder="Ej: Sede Central" value={ubicacion} onChange={e => setUbicacion(e.target.value)} style={selectSx} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Situación comercial</p>
              <select value={sitCom} onChange={e => setSitCom(e.target.value)} style={selectSx}>
                <option value="">Sin situación</option>
                {SITUACIONES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Prioridad</p>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={selectSx}>
                <option value="">Sin prioridad</option>
                {PRIORIDADES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Responsable</p>
              <select value={respId} onChange={e => setRespId(e.target.value)} style={selectSx}>
                <option value="">Sin responsable</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Vehículo</p>
              <VehicleAutocomplete vehicles={vehicles} value={vehId} onChange={setVehId} placeholder="Buscar vehículo..." />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Observaciones</p>
            <textarea placeholder="Opcional" value={obs} onChange={e => setObs(e.target.value)} rows={3} style={{...selectSx, resize: 'vertical'}} />
          </div>
          <button type="submit" disabled={saving || !name.trim()} className="w-full text-[11px] font-semibold py-2 rounded transition-opacity disabled:opacity-40" style={{ background: 'var(--accent-blue)', color: '#fff' }}>{saving ? '...' : '✅ Crear'}</button>
        </form>
      </div>
    </div>
  )
}

export default function LogisticaPage() {
  return (
    <ThemeProvider>
      <LogisticaInner />
    </ThemeProvider>
  )
}
