'use client'

import { useState, useEffect, useCallback } from 'react'
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { fmtDate } from '@/lib/dates'
import { stateColor } from '@/lib/colors'
import CalendarView from '@/components/calendar-view'
import SearchableSelect from '@/components/searchable-select'

interface VehiculoItem {
  id: string; name: string; matricula: string; brand: string; model: string; year: number
  estadoActual: string; area: string; subEstado: string; situacion: string; ubicacion: string
  fechaCompra: string; fechaListo: string | null; fechaVendido: string | null
  responsable: string | null; responsableNombre: string | null
  precioCompra: number | null; precioVenta: number | null; margenBruto: number | null
  combustible: string; color: string; kilometrajeEntrada: number | null; lineaNegocio: string; tipo: string
  notas: string; tiempoTotalDias: number | null; diasActivoSinCerrar: number | null
  inicioTaller: string | null; finTaller: string | null; inicioChapa: string | null; finChapa: string | null
  inicioPreparacion: string | null; finPreparacion: string | null; inicioLogistica: string | null; finLogistica: string | null
  tiempoTaller: number | null; tiempoChapa: number | null; tiempoPreparacion: number | null; tiempoLogistica: number | null
  diasFuera: number | null; fechaCesion: string | null; colaborador: string | null
  fotos: { name: string; url: string }[]
}

function fmtEuro(n: number | null | undefined): string {
  if (n == null) return '-'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function VehiculosInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<VehiculoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban' | 'calendario'>('tabla')
  const [filterEstado, setFilterEstado] = useState('')
  const [filterResponsable, setFilterResponsable] = useState('')
  const [filterMarca, setFilterMarca] = useState('')
  const [filterLinea, setFilterLinea] = useState('')
  const [filterSituacion, setFilterSituacion] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<VehiculoItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [editNotas, setEditNotas] = useState('')

  const allEstados = [...new Set(records.map(r => r.estadoActual).filter(Boolean))]

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      if (filterResponsable) params.set('responsable', filterResponsable)
      if (filterMarca) params.set('marca', filterMarca)
      if (filterLinea) params.set('linea', filterLinea)
      if (filterSituacion) params.set('situacion', filterSituacion)
      if (search) params.set('q', search)
      const [res, empRes] = await Promise.all([
        fetch(`/api/vehiculos${params.toString() ? '?' + params : ''}`),
        fetch('/api/employees'),
      ])
      const json = await res.json()
      const empJson = await empRes.json()
      if (json.success) setRecords(json.data)
      if (empJson.success) setEmployees(empJson.data)
    } catch {} finally { setLoading(false) }
  }, [filterEstado, filterResponsable, filterMarca, filterLinea, filterSituacion, search])

  useEffect(() => { fetchData() }, [fetchData])

  const columns = [...new Set(allEstados)].map(est => ({ estado: est, items: records.filter(r => r.estadoActual === est) }))

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
    if (newEstado === record.estadoActual) return
    setRecords(prev => prev.map(r => r.id === record.id ? { ...r, estadoActual: newEstado } : r))
    fetch(`/api/vehiculos/${record.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: newEstado }) }).catch(() => {})
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
        <div className="flex items-center justify-end mb-4 animate-fade-up">
          <DarkModeToggle />
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar matrícula, marca, modelo..."
            className="text-[11px] px-2 py-1.5 rounded outline-none flex-1 min-w-[150px]"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }} />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-up" style={{ animationDelay: '75ms' }}>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {allEstados.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <SearchableSelect items={employees} value={filterResponsable} onChange={setFilterResponsable}
            placeholder="Filtrar responsable..." displayFn={(e: any) => e.name} />
          <input type="text" value={filterMarca} onChange={e => setFilterMarca(e.target.value)}
            placeholder="Marca..." className="text-[11px] px-2 py-1.5 rounded outline-none w-24"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }} />
          <select value={filterLinea} onChange={e => setFilterLinea(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Línea</option>
            {[...new Set(records.map(r => r.lineaNegocio).filter(Boolean))].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filterSituacion} onChange={e => setFilterSituacion(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Situación</option>
            {['Stock', 'Exposición', 'Vendido', 'Cedido'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
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
                      <h3 className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: c.text }}>{col.estado}</h3>
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.text }}>{col.items.length}</span>
                    </div>
                    <div className="space-y-2 overflow-y-auto flex-1">
                      {col.items.length === 0 ? <p className="text-[11px] py-6 text-center italic" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                      : col.items.map(item => (
                        <DraggableVehCard key={item.id} item={item} onClick={() => { setSelected(item); setEditNotas(item.notas); setEditing(false) }} />
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
              items={records.filter(r => r.fechaCompra || r.fechaListo).map(r => ({ id: r.id, titulo: `${r.matricula} — ${r.brand} ${r.model}`, fecha: r.fechaCompra || r.fechaListo!, estado: r.estadoActual, area: r.area }))}
              typeColors={{ 'Logística': '#eab308', 'Taller': '#3b82f6', 'Chapa': '#3b82f6', 'Preparación': '#3b82f6', 'Stock': '#9ca3af', 'Exposición': '#9ca3af', 'Vendido': '#22c55e', 'Cedido': '#ef4444' }}
            />
          </div>
        ) : (
          <div className="space-y-2 animate-fade-up">
            {records.length === 0 ? (
              <div className="card p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin vehículos</p></div>
            ) : records.map(r => {
              const ec = stateColor(r.estadoActual)
              const overdue = r.diasActivoSinCerrar != null && r.diasActivoSinCerrar > 60
              return (
                <div key={r.id} onClick={() => { setSelected(r); setEditNotas(r.notas); setEditing(false) }}
                  className="card p-3 sm:p-4 cursor-pointer transition-all hover:opacity-90 flex items-start gap-3"
                  style={{ background: 'var(--bg-card)', borderLeft: `4px solid ${ec.text}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{r.matricula} — {r.brand} {r.model} ({r.year})</h3>
                      {overdue && <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}>⚠️ Lento</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ background: ec.bg, color: ec.text }}>{r.estadoActual}</span>
                      {r.precioVenta != null && <span style={{ color: 'var(--accent-blue)' }}>💰 {fmtEuro(r.precioVenta)}</span>}
                      {r.margenBruto != null && <span style={{ color: r.margenBruto > 0 ? 'var(--accent-emerald)' : 'var(--error)' }}>📊 {fmtEuro(r.margenBruto)}</span>}
                      {r.responsableNombre && <span>👤 {r.responsableNombre}</span>}
                      {r.fechaCompra && <span>📅 {fmtDate(r.fechaCompra)}</span>}
                      {r.tiempoTotalDias != null && <span>⏱ {r.tiempoTotalDias}d</span>}
                      {r.situacion && <span>📍 {r.situacion}</span>}
                      {r.combustible && <span>⛽ {r.combustible}</span>}
                      {r.lineaNegocio && <span>💼 {r.lineaNegocio}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {selected && !editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="card w-full max-w-2xl animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{selected.matricula} — {selected.brand} {selected.model} ({selected.year})</h2>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(true); setEditNotas(selected.notas) }} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
                  <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-4">
                <div><span style={{ color: 'var(--text-muted)' }}>Estado:</span> <span className="font-semibold text-[11px] px-2 py-0.5 rounded" style={{ background: stateColor(selected.estadoActual).bg, color: stateColor(selected.estadoActual).text }}>{selected.estadoActual}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Situación:</span> <span style={{ color: 'var(--text)' }}>{selected.situacion}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Responsable:</span> <span style={{ color: 'var(--text)' }}>{selected.responsableNombre || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Colaborador:</span> <span style={{ color: 'var(--text)' }}>{selected.colaborador || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Línea negocio:</span> <span style={{ color: 'var(--text)' }}>{selected.lineaNegocio || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tipo:</span> <span style={{ color: 'var(--text)' }}>{selected.tipo || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Combustible:</span> <span style={{ color: 'var(--text)' }}>{selected.combustible || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Color:</span> <span style={{ color: 'var(--text)' }}>{selected.color || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Kilometraje:</span> <span style={{ color: 'var(--text)' }}>{selected.kilometrajeEntrada != null ? `${selected.kilometrajeEntrada} km` : '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Ubicación:</span> <span style={{ color: 'var(--text)' }}>{selected.ubicacion || '—'}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Precio compra:</span> <span style={{ color: 'var(--text)' }}>{fmtEuro(selected.precioCompra)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Precio venta:</span> <span style={{ color: 'var(--accent-blue)' }}>{fmtEuro(selected.precioVenta)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Margen bruto:</span> <span style={{ color: selected.margenBruto && selected.margenBruto > 0 ? 'var(--accent-emerald)' : 'var(--error)' }}>{fmtEuro(selected.margenBruto)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Días total:</span> <span style={{ color: 'var(--text)' }}>{selected.tiempoTotalDias ?? '—'}d</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Días activo:</span> <span style={{ color: selected.diasActivoSinCerrar != null && selected.diasActivoSinCerrar > 60 ? '#ef4444' : 'var(--text)' }}>{selected.diasActivoSinCerrar ?? '—'}d</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha compra:</span> <span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaCompra)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha listo:</span> <span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaListo)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha venta:</span> <span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaVendido)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha cesión:</span> <span style={{ color: 'var(--text)' }}>{fmtDate(selected.fechaCesion)}</span></div>
              </div>
              {selected.tiempoTaller != null || selected.tiempoChapa != null || selected.tiempoPreparacion != null || selected.tiempoLogistica != null ? (
                <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
                  {selected.tiempoLogistica != null && <div className="card p-2 text-center" style={{ background: 'var(--bg-pill)' }}><span style={{ color: 'var(--text-muted)' }}>Logística</span><br /><strong style={{ color: 'var(--text)' }}>{selected.tiempoLogistica}h</strong></div>}
                  {selected.tiempoTaller != null && <div className="card p-2 text-center" style={{ background: 'var(--bg-pill)' }}><span style={{ color: 'var(--text-muted)' }}>Taller</span><br /><strong style={{ color: 'var(--text)' }}>{selected.tiempoTaller}h</strong></div>}
                  {selected.tiempoChapa != null && <div className="card p-2 text-center" style={{ background: 'var(--bg-pill)' }}><span style={{ color: 'var(--text-muted)' }}>Chapa</span><br /><strong style={{ color: 'var(--text)' }}>{selected.tiempoChapa}h</strong></div>}
                  {selected.tiempoPreparacion != null && <div className="card p-2 text-center" style={{ background: 'var(--bg-pill)' }}><span style={{ color: 'var(--text-muted)' }}>Preparación</span><br /><strong style={{ color: 'var(--text)' }}>{selected.tiempoPreparacion}h</strong></div>}
                </div>
              ) : null}
              {selected.notas && <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}><p className="text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>Notas:</p><p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontSize: 11 }}>{selected.notas}</p></div>}
              {selected.fotos.length > 0 && (
                <div className="mt-2 pt-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
                  {selected.fotos.map(f => (
                    <a key={f.name} href={f.url} target="_blank" rel="noopener noreferrer"><img src={f.url} alt={f.name} className="w-16 h-16 rounded object-cover" /></a>
                  ))}
                </div>
              )}
              <button onClick={async () => {
                if (!confirm('¿Mover a la papelera?')) return
                try {
                  const r = await fetch(`/api/vehiculos/${selected.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'DELETE' })
                  if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                  setSelected(null); fetchData()
                } catch { alert('Error de red'); }
              }} className="w-full text-[11px] font-semibold py-2 rounded mt-4" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}>🗑 Mover a papelera</button>
            </div>
          </div>
        )}

        {selected && editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) { setSelected(null); setEditing(false) } }}>
            <div className="card w-full max-w-2xl animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✏️ {selected.matricula} — {selected.brand} {selected.model}</h2>
                <button onClick={() => setEditing(false)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Precio compra (€):</span>
                  <input type="number" value={selected.precioCompra ?? ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, precioCompra: e.target.value ? parseFloat(e.target.value) : null } : r))} style={editInputStyle} /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Precio venta (€):</span>
                  <input type="number" value={selected.precioVenta ?? ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, precioVenta: e.target.value ? parseFloat(e.target.value) : null } : r))} style={editInputStyle} /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Color:</span>
                  <input value={selected.color} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, color: e.target.value } : r))} style={editInputStyle} /></div>
                <div><span className="font-medium" style={{ color: 'var(--text-muted)' }}>Kilometraje:</span>
                  <input type="number" value={selected.kilometrajeEntrada ?? ''} onChange={e => setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, kilometrajeEntrada: e.target.value ? parseInt(e.target.value) : null } : r))} style={editInputStyle} /></div>
              </div>
              <div className="mt-2"><span className="font-medium text-xs" style={{ color: 'var(--text-muted)' }}>Notas:</span>
                <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={4} className="w-full text-xs px-2 py-1.5 rounded outline-none resize-none mt-1" style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }} /></div>
              <div className="flex gap-2 mt-4">
                <button onClick={async () => {
                  setSaving(true)
                  const tk = new URLSearchParams(window.location.search).get('token') || ''
                  await fetch(`/api/vehiculos/${selected.id}?token=${tk}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ precioCompra: selected.precioCompra, precioVenta: selected.precioVenta, color: selected.color, kilometrajeEntrada: selected.kilometrajeEntrada, notas: editNotas }) })
                  setRecords(prev => prev.map(r => r.id === selected.id ? { ...r, notas: editNotas } : r))
                  setSaving(false); setEditing(false)
                }} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }} disabled={saving}>{saving ? 'Guardando...' : '💾 Guardar'}</button>
                <button onClick={async () => {
                  if (!confirm('¿Mover a la papelera?')) return
                  try {
                    const r = await fetch(`/api/vehiculos/${selected.id}?token=` + new URLSearchParams(window.location.search).get('token'), { method: 'DELETE' })
                    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                    setSelected(null); setEditing(false); fetchData()
                  } catch { alert('Error de red'); }
                }} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        )}
        {confirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <div className="card p-5 max-w-sm animate-fade-up" style={{ background: 'var(--bg-card)' }}>
              <p className="text-sm font-semibold mb-4 text-center" style={{ color: 'var(--text)' }}>🗑 ¿Eliminar este registro?</p>
              <div className="flex gap-2">
                <button onClick={async () => {
                  const id = confirmDelete; setConfirmDelete(null)
                  try {
                    const tk = new URLSearchParams(window.location.search).get('token') || ''
                    const r = await fetch(`/api/vehiculos/${id}?token=${tk}`, { method: 'DELETE' })
                    if (!r.ok) { const d = await r.json(); alert(d.error || 'Error'); return }
                    setSelected(null); setEditing(false); fetchData()
                  } catch { alert('Error de red'); }
                }} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', cursor: 'pointer' }}>🗑 Eliminar</button>
                <button onClick={() => setConfirmDelete(null)} className="flex-1 text-[11px] font-semibold py-2.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
              </div>
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

function DraggableVehCard({ item, onClick }: { item: VehiculoItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}
  const ec = stateColor(item.estadoActual)
  return (
    <button ref={setNodeRef} style={{ ...style, borderLeft: `3px solid ${ec.text}` }}
      {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing p-2.5 transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.matricula}</p>
      <p className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{item.brand} {item.model} ({item.year})</p>
      <div className="flex flex-wrap gap-1 mt-1">
        {item.precioVenta != null && <span className="text-[9px]" style={{ color: 'var(--accent-blue)' }}>{item.precioVenta.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>}
        {item.tiempoTotalDias != null && <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>⏱ {item.tiempoTotalDias}d</span>}
      </div>
    </button>

  )
}

const editInputStyle: React.CSSProperties = { width: '100%', fontSize: 11, padding: '6px 8px', borderRadius: 6, background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', outline: 'none', marginTop: 2 }

export default function VehiculosPage() {
  return <ThemeProvider><VehiculosInner /></ThemeProvider>
}
