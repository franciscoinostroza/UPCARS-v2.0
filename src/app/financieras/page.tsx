'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { stateColor } from '@/lib/colors'

interface FinancieraItem {
  id: string; nombre: string; estado: string; telefono: string; email: string
  personaContacto: string; datosAcceso: string; enlaceAcceso: string; notas: string
  tarifasLeasing: { name: string; url: string }[]
  tarifasVnVo: { name: string; url: string }[]
}

const ESTADOS = ['', 'Activa', 'Inactiva', 'En negociación']

const ICONS: Record<string, string> = {
  LENDROCK: '🏦',
  SOFINCO: '💳',
  COFIDIS: '🔄',
  IBERCAJA: '🏛️',
}

function getIcon(name: string): string {
  for (const [k, v] of Object.entries(ICONS)) {
    if (name.includes(k)) return v
  }
  return '🏦'
}

function FinancierasInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<FinancieraItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'cuadricula' | 'kanban' | 'lista'>('cuadricula')
  const [filterEstado, setFilterEstado] = useState('')
  const [selected, setSelected] = useState<FinancieraItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editData, setEditData] = useState<any>({})

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      const res = await fetch(`/api/financieras${params.toString() ? '?' + params : ''}`)
      const json = await res.json()
      if (json.success) setRecords(json.data)
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
    fetch(`/api/financieras/${record.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: newEstado }) }).catch(() => {})
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} style={{ height: 280, borderRadius: 12 }} />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <h1 className="text-lg sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>🏦 Financieras</h1>
          <DarkModeToggle />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
          <div className="flex gap-1">
            {(['cuadricula', 'kanban', 'lista'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className="px-2 py-1 text-[10px] sm:text-xs rounded font-medium transition-all"
                style={{ background: vista === v ? 'var(--bg-pill)' : 'transparent', color: vista === v ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {v === 'cuadricula' ? '📋 Cuadrícula' : v === 'kanban' ? '📊 Kanban' : '📝 Lista'}
              </button>
            ))}
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {vista === 'kanban' ? (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {columns.map(col => {
                const c = stateColor(col.estado)
                return (
                  <div key={col.estado} className="pipeline-column p-3" style={{ minWidth: 240, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '65vh', background: 'var(--bg-card)' }}>
                    <div className="flex items-center gap-2 mb-3 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.text }} />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.text }}>{col.estado}</h3>
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{col.items.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {col.items.length === 0 ? <p className="text-[11px] py-6 text-center italic" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                      : col.items.map(item => (
                        <DraggableFinCard key={item.id} item={item} onClick={() => { setSelected(item); setEditing(false); setEditData(item) }} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </DndContext>
        ) : vista === 'lista' ? (
          <div className="space-y-1 animate-fade-up">
            {records.map(r => {
              const ec = stateColor(r.estado)
              return (
                <div key={r.id} onClick={() => { setSelected(r); setEditing(false); setEditData(r) }}
                  className="card p-3 cursor-pointer transition-all hover:opacity-80 flex items-center gap-3"
                  style={{ background: 'var(--bg-card)', borderLeft: `3px solid ${ec.text}` }}>
                  <span className="text-lg shrink-0">{getIcon(r.nombre)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{r.nombre}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{r.personaContacto}{r.telefono ? ` · ${r.telefono}` : ''}</p>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0" style={{ background: ec.bg, color: ec.text }}>{r.estado}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 animate-fade-up">
            {records.map(r => {
              const ec = stateColor(r.estado)
              const primeraImagen = r.tarifasLeasing?.[0]?.url || r.tarifasVnVo?.[0]?.url
              return (
                <div key={r.id} onClick={() => { setSelected(r); setEditing(false); setEditData(r) }}
                  className="card cursor-pointer transition-all hover:opacity-90 overflow-hidden"
                  style={{ background: 'var(--bg-card)' }}>
                  {primeraImagen ? (
                    <img src={primeraImagen} alt={r.nombre} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center" style={{ background: 'var(--bg-pill)' }}>
                      <span className="text-5xl opacity-40">{getIcon(r.nombre)}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{r.nombre}</h3>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{r.personaContacto || r.telefono || r.email || ''}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded inline-block mt-1" style={{ background: ec.bg, color: ec.text }}>{r.estado}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selected && !editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getIcon(selected.nombre)}</span>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.nombre}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(true); setEditData(selected) }} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
                  <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded inline-block mb-3" style={{ background: stateColor(selected.estado).bg, color: stateColor(selected.estado).text }}>{selected.estado}</span>
              <div className="space-y-1.5 text-xs">
                {selected.personaContacto && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>👤 Contacto:</span> <span style={{ color: 'var(--text)' }}>{selected.personaContacto}</span></div>}
                {selected.telefono && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>📞 Teléfono:</span> <span style={{ color: 'var(--text)' }}>{selected.telefono}</span></div>}
                {selected.email && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>✉️ Email:</span> <span style={{ color: 'var(--accent-blue)' }}>{selected.email}</span></div>}
                {selected.enlaceAcceso && <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>🔗 Enlace:</span> <span style={{ color: 'var(--accent-blue)' }}>{selected.enlaceAcceso}</span></div>}
                {selected.datosAcceso && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>🔑 Datos de Acceso:</p><p style={{ color: 'var(--text-secondary)' }}>{selected.datosAcceso}</p></div>}
                {selected.notas && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>📝 Notas:</p><p style={{ color: 'var(--text-secondary)' }}>{selected.notas}</p></div>}
                {(selected.tarifasLeasing.length > 0 || selected.tarifasVnVo.length > 0) && (
                  <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>📎 Archivos:</p>
                    {selected.tarifasLeasing.map(f => <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer" className="block text-[11px]" style={{ color: 'var(--accent-blue)' }}>📄 Tarifa: {f.name}</a>)}
                    {selected.tarifasVnVo.map(f => <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer" className="block text-[11px]" style={{ color: 'var(--accent-blue)' }}>📄 VN-VO: {f.name}</a>)}
                  </div>
                )}
              </div>
              <button onClick={async () => {
                if (!confirm('¿Eliminar esta financiera?')) return
                try {
                  const r = await fetch(`/api/financieras/${selected.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'DELETE' })
                  if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                  setSelected(null); fetchData()
                } catch { alert('Error de red'); }
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
              <div className="space-y-3 text-xs">
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Estado:</span>
                  <select value={selected.estado} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, estado: e.target.value } : r))} style={inputSx} className="mt-1">
                    {ESTADOS.map(s => <option key={s} value={s}>{s || 'Sin estado'}</option>)}
                  </select>
                </div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Contacto:</span>
                  <input value={selected.personaContacto} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, personaContacto: e.target.value } : r))} style={inputSx} className="mt-1" /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Teléfono:</span>
                  <input value={selected.telefono} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, telefono: e.target.value } : r))} style={inputSx} className="mt-1" /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Email:</span>
                  <input value={selected.email} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, email: e.target.value } : r))} style={inputSx} className="mt-1" /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Enlace de Acceso:</span>
                  <input value={selected.enlaceAcceso} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, enlaceAcceso: e.target.value } : r))} style={inputSx} className="mt-1" /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Datos de Acceso:</span>
                  <textarea value={selected.datosAcceso} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, datosAcceso: e.target.value } : r))} rows={2} style={{...inputSx, resize: 'vertical'}} className="mt-1" /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Notas:</span>
                  <textarea value={editData.notas || ''} onChange={e => setEditData({...editData, notas: e.target.value})} rows={2} style={{...inputSx, resize: 'vertical'}} className="mt-1" /></div>
                <div className="flex gap-2 pt-2">
                  <button onClick={async () => {
                    setSaving(true)
                    const tk = new URLSearchParams(window.location.search).get('token') || ''
                    await fetch(`/api/financieras/${selected.id}?token=${tk}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado: selected.estado, personaContacto: selected.personaContacto, telefono: selected.telefono, email: selected.email, enlaceAcceso: selected.enlaceAcceso, datosAcceso: selected.datosAcceso, notas: editData.notas }) })
                    setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, notas: editData.notas } : r))
                    setSaving(false); setEditing(false)
                  }} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar'}</button>
                  <button onClick={async () => {
                    if (!confirm('¿Eliminar esta financiera?')) return
                    try {
                      const r = await fetch(`/api/financieras/${selected.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'DELETE' })
                      if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                      setSelected(null); setEditing(false); fetchData()
                    } catch { alert('Error de red'); }
                  }} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>🗑 Eliminar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableFinCard({ item, onClick }: { item: FinancieraItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  const ec = stateColor(item.estado)
  return (
    <div ref={setNodeRef} style={{ ...style, borderLeft: `3px solid ${ec.text}`, background: 'var(--bg-card)' }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="card p-2.5 cursor-grab active:cursor-grabbing transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
      <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{item.personaContacto || item.telefono || ''}</p>
    </div>
  )
}

const inputSx: React.CSSProperties = { width: '100%', fontSize: 11, padding: '6px 8px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none' }

export default function FinancierasPage() {
  return <ThemeProvider><FinancierasInner /></ThemeProvider>
}
