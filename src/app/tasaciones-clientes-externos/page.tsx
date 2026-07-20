'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'
import { stateColor, priorityColor } from '@/lib/colors'
import CalendarView from '@/components/calendar-view'
import SearchableSelect from '@/components/searchable-select'

interface TasacionItem {
  id: string; nombre: string; estado: string; prioridad: string
  descripcion: string; tipoTarea: string[]; area: string[]
  plazo: string | null; responsableId: string | null; responsableNombre: string | null
  archivos: { name: string; url: string }[]
}

const ESTADOS = ['', 'Sin empezar', 'Seguimiento', 'Vendido', 'Desiste compra']
const PRIORIDADES = ['', 'Alta', 'Media', 'Baja']

function TasacionesClientesExternosInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<TasacionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban' | 'calendario'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPrioridad, setFilterPrioridad] = useState('')
  const [filterResponsable, setFilterResponsable] = useState('')
  const [filterTipoTarea, setFilterTipoTarea] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [selected, setSelected] = useState<TasacionItem | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [res, empRes] = await Promise.all([
        fetch('/api/tasaciones'),
        fetch('/api/employees'),
      ])
      const json = await res.json()
      const empJson = await empRes.json()
      if (json.success) setRecords(json.data)
      if (empJson.success) setEmployees(empJson.data)
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const allTipos = [...new Set(records.flatMap(r => r.tipoTarea))]
  const allAreas = [...new Set(records.flatMap(r => r.area))]

  const filtrados = records.filter(r => {
    if (filterPrioridad && r.prioridad !== filterPrioridad) return false
    if (filterResponsable && r.responsableId !== filterResponsable) return false
    if (filterTipoTarea && !r.tipoTarea.includes(filterTipoTarea)) return false
    if (filterArea && !r.area.includes(filterArea)) return false
    return true
  })

  const columns = ESTADOS.filter(Boolean).map(est => ({ estado: est, items: filtrados.filter(r => r.estado === est) }))

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
    fetch(`/api/tasaciones/${record.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: newEstado }) }).catch(() => {})
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
          <Skeleton style={{ width: 240, height: 28, marginBottom: 16 }} />
          <Skeleton style={{ width: '100%', height: 300 }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <h1 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>📋 Tasaciones y Clientes Externos</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(true)} className="text-[11px] font-semibold px-3 py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>+ Nueva</button>
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <div className="flex gap-1">
            {(['tabla', 'kanban', 'calendario'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all"
                style={{ background: vista === v ? 'var(--bg-pill)' : 'transparent', color: vista === v ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {v === 'tabla' ? '📋 Tabla' : v === 'kanban' ? '📊 Kanban' : '📅 Calendario'}
              </button>
            ))}
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterPrioridad} onChange={e => setFilterPrioridad(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todas las prioridades</option>
            <option value="Alta">🔴 Alta</option>
            <option value="Media">🟡 Media</option>
            <option value="Baja">🟢 Baja</option>
          </select>
          <SearchableSelect items={employees} value={filterResponsable} onChange={setFilterResponsable} placeholder="Filtrar por responsable..." displayFn={(e: any) => e.name} />
          {allTipos.length > 0 && (
            <select value={filterTipoTarea} onChange={e => setFilterTipoTarea(e.target.value)}
              className="text-[11px] px-2 py-1.5 rounded outline-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <option value="">Todos los tipos</option>
              {allTipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {allAreas.length > 0 && (
            <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
              className="text-[11px] px-2 py-1.5 rounded outline-none"
              style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <option value="">Todas las áreas</option>
              {allAreas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </div>

        {vista === 'kanban' ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map(col => {
                const c = stateColor(col.estado)
                return (
                  <DroppableColumn key={col.estado} id={col.estado}>
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.text }} />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.text }}>{col.estado}</h3>
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{col.items.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {col.items.length === 0 ? <p className="text-[11px] py-6 text-center italic" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                      : col.items.map(item => (
                        <DraggableTasacionCard key={item.id} item={item} onClick={() => setSelected(item)} />
                      ))}
                    </div>
                  </DroppableColumn>
                )
              })}
            </div>
          </DndContext>
        ) : vista === 'calendario' ? (
          <div className="animate-fade-up">
            <CalendarView
              items={filtrados.filter(r => r.plazo).map(r => ({ id: r.id, titulo: r.nombre, fecha: r.plazo!, estado: r.estado, area: r.tipoTarea.join(', ') }))}
              typeColors={{ 'Sin empezar': '#eab308', 'Seguimiento': '#3b82f6', 'Vendido': '#22c55e', 'Desiste compra': '#ef4444' }}
            />
          </div>
        ) : (
          <div className="space-y-2 animate-fade-up">
            {filtrados.length === 0 ? (
              <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin tasaciones</p></div>
            ) : filtrados.map(r => {
              const ec = stateColor(r.estado)
              const pc = priorityColor(r.prioridad)
              const overdue = r.plazo && new Date(r.plazo) < new Date()
              return (
                <div key={r.id} onClick={() => setSelected(r)}
                  className="card p-3 sm:p-4 cursor-pointer transition-all hover:opacity-90 flex items-start gap-3"
                  style={{ background: 'var(--bg-card)', borderLeft: `4px solid ${ec.text}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{r.nombre}</h3>
                      {overdue && <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>Vencido</span>}
                    </div>
                    {r.descripcion && <p className="text-[11px] mb-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{r.descripcion}</p>}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {r.estado && <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: ec.bg, color: ec.text }}>{r.estado}</span>}
                      {r.prioridad && <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: pc.bg, color: pc.text }}>{r.prioridad}</span>}
                      {r.tipoTarea.map(t => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{t}</span>)}
                      {r.area.map(a => <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{a}</span>)}
                      {r.responsableNombre && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>👤 {r.responsableNombre}</span>}
                      {r.plazo && <span className="text-[10px]" style={{ color: overdue ? '#ef4444' : 'var(--text-muted)' }}>📅 {fmtDate(r.plazo)}</span>}
                      {r.archivos.length > 0 && <span className="text-[10px]" style={{ color: 'var(--accent-blue)' }}>📎 {r.archivos.length}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.nombre}</h2>
                <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className="space-y-3 text-xs mb-4">
                <div className="flex flex-wrap gap-2">
                  {selected.estado && <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: stateColor(selected.estado).bg, color: stateColor(selected.estado).text }}>{selected.estado}</span>}
                  {selected.prioridad && <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: priorityColor(selected.prioridad).bg, color: priorityColor(selected.prioridad).text }}>{selected.prioridad}</span>}
                </div>
                {selected.descripcion && <p style={{ color: 'var(--text-secondary)' }}>{selected.descripcion}</p>}
                <div className="grid grid-cols-2 gap-2">
                  {selected.tipoTarea.length > 0 && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Tipo:</span> <span style={{ color: 'var(--text)' }}>{selected.tipoTarea.join(', ')}</span></div>}
                  {selected.area.length > 0 && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Área:</span> <span style={{ color: 'var(--text)' }}>{selected.area.join(', ')}</span></div>}
                  {selected.responsableNombre && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Responsable:</span> <span style={{ color: 'var(--text)' }}>{selected.responsableNombre}</span></div>}
                  {selected.plazo && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Plazo:</span> <span style={{ color: new Date(selected.plazo) < new Date() ? '#ef4444' : 'var(--text)' }}>{fmtDate(selected.plazo)}</span></div>}
                </div>
                {selected.archivos.length > 0 && (
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Archivos:</p>
                    {selected.archivos.map(f => (
                      <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] py-0.5" style={{ color: 'var(--accent-blue)' }}>📎 {f.name}</a>
                    ))}
                  </div>
                )}
                <button onClick={async () => {
                  if (!confirm('¿Eliminar esta tasación?')) return
                  try {
                    await fetch(`/api/tasaciones/${selected.id}` + "?token=" + new URLSearchParams(window.location.search).get("token"), { method: 'DELETE' })
                    setSelected(null); fetchData()
                  } catch (e) { alert('Error de red al eliminar'); }
                }} className="w-full text-[11px] font-semibold py-2 rounded mt-2" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false) }}>
            <div className="card w-full max-w-md animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Nueva tasación</h2>
              <form onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.target as HTMLFormElement)
                await fetch('/api/tasaciones', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre: fd.get('nombre'),
                    estado: fd.get('estado') || 'Sin empezar',
                    prioridad: fd.get('prioridad') || undefined,
                    descripcion: fd.get('descripcion') || undefined,
                    tipoTarea: fd.getAll('tipoTarea').filter(Boolean) as string[],
                    area: fd.getAll('area').filter(Boolean) as string[],
                    plazo: fd.get('plazo') || undefined,
                    responsableId: fd.get('responsableId') || undefined,
                  }),
                })
                setShowCreate(false)
                fetchData()
              }} className="space-y-3">
                {[{ name: 'nombre', label: 'Nombre *', type: 'input', required: true },
                  { name: 'estado', label: 'Estado', type: 'select', options: ESTADOS.filter(Boolean) },
                  { name: 'prioridad', label: 'Prioridad', type: 'select', options: ['Alta', 'Media', 'Baja'] },
                ].map(f => (
                  <div key={f.name}>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{f.label}</p>
                    {f.type === 'input' ? (
                      <input name={f.name} required={f.required} style={selectSx} placeholder={`Ej: Tasación ${Math.random().toString(36).slice(2,6).toUpperCase()}`} />
                    ) : (
                      <select name={f.name} style={selectSx}>
                        {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </div>
                ))}
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Tipo de tarea</p>
                  <select name="tipoTarea" multiple style={{ ...selectSx, height: 60 }}>
                    <option value="Llamada">📞 Llamada</option>
                    <option value="Email">📧 Email</option>
                    <option value="Visita">🏠 Visita</option>
                    <option value="Presupuesto">💰 Presupuesto</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Área</p>
                  <select name="area" multiple style={{ ...selectSx, height: 60 }}>
                    <option value="Comercial">💼 Comercial</option>
                    <option value="Postventa">🔧 Postventa</option>
                    <option value="Administración">📊 Administración</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Responsable</p>
                    <select name="responsableId" style={selectSx}>
                      <option value="">Sin asignar</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Plazo</p>
                    <input name="plazo" type="date" style={selectSx} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Descripción</p>
                  <textarea name="descripcion" rows={2} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} placeholder="Opcional" />
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

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="pipeline-column p-3" style={{ minWidth: 220, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '65vh', outline: isOver ? '2px solid var(--accent-blue)' : 'none', outlineOffset: -2, background: 'var(--bg-card)' }}>
      {children}
    </div>
  )
}

function DraggableTasacionCard({ item, onClick }: { item: TasacionItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  const ec = stateColor(item.estado)
  const pc = priorityColor(item.prioridad)
  return (
    <button ref={setNodeRef} style={{ ...style, borderLeft: `3px solid ${ec.text}` }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing p-2.5 transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate mb-1" style={{ color: 'var(--text)' }}>{item.nombre}</p>
      <div className="flex flex-wrap gap-1">
        {item.prioridad && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: pc.bg, color: pc.text }}>{item.prioridad}</span>}
        {item.tipoTarea.map(t => <span key={t} className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{t}</span>)}
        {item.plazo && <span className="text-[9px]" style={{ color: new Date(item.plazo) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>📅 {fmtDate(item.plazo)}</span>}
      </div>
    </button>
  )
}

const selectSx: React.CSSProperties = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

export default function TasacionesClientesExternosPage() {
  return <ThemeProvider><TasacionesClientesExternosInner /></ThemeProvider>
}
