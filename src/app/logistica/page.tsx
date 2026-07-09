'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { useUser, UserSelectorModal } from '@/components/user-selector'
import CommentsSection from '@/components/comments-section'

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

const ESTADOS = ['Pendiente autorización', 'Autorizado', 'Completado', 'Bloqueado']
const ESTADO_ICONS: Record<string, string> = {
  'Pendiente autorización': '⏳', 'Autorizado': '📝', 'Completado': '✅', 'Bloqueado': '🚫',
}
const SITUACIONES = ['', 'Vendido', 'Exposición', 'Renting']
const PRIORIDADES = ['', 'Alta', 'Media', 'Baja']

function fmtDate(d: string | null): string {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function toInputDate(d: string | null): string {
  if (!d) return ''
  return d.split('T')[0]
}

const selectSx = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

function LogisticaInner() {
  const { dark } = useTheme()
  const { user, saveUser } = useUser()
  const [records, setRecords] = useState<LogItem[]>([])
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'tabla' | 'kanban'>('tabla')
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

  const columns = ESTADOS.map(est => ({ estado: est, items: records.filter(r => r.estado === est) }))

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
      <UserSelectorModal employees={employees} user={user} onSave={saveUser} />
      <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>🚛 Logística</h1>
            {user && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>👤 {user}</span>}
          </div>
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
          </div>
          <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="text-[11px] px-2 py-1.5 rounded outline-none" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        {/* Kanban */}
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
                    <button key={item.id} onClick={() => { setSelected(item); setEditing(false) }} className="vehicle-card w-full text-left p-2 cursor-pointer transition-all hover:opacity-80">
                      <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text)' }}>{item.nombre}</p>
                      <div className="flex items-center gap-1 text-[10px] mt-0.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                        {item.vehiculoNombre && <span>🚗 {item.vehiculoNombre}</span>}
                        {item.ubicacion && <span>📍 {item.ubicacion}</span>}
                        {item.responsableNombre && <span>👤 {item.responsableNombre}</span>}
                        {item.fechaProgramada && <span>📅 {fmtDate(item.fechaProgramada)}</span>}
                      </div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {item.situacionComercial && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>{item.situacionComercial}</span>}
                        {item.prioridad && <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: item.prioridad === 'Alta' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)', color: item.prioridad === 'Alta' ? '#ef4444' : '#eab308' }}>{item.prioridad}</span>}
                        {item.authFileName && <span className="text-[9px]" style={{ color: 'var(--accent-blue)' }}>📎</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tabla */
          <div className="card overflow-x-auto animate-fade-up" style={{ animationDelay: '75ms' }}>
            {records.length === 0 ? (
              <div className="p-8 text-center"><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin registros</p></div>
            ) : (
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left p-2 sm:p-3 font-medium">ID</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Vehículo</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Estado</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Ubicación</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Situación</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Prioridad</th>
                    <th className="text-left p-2 sm:p-3 font-medium">Responsable</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha prog.</th>
                    <th className="text-right p-2 sm:p-3 font-medium">Fecha real.</th>
                    <th className="text-center p-2 sm:p-3 font-medium">📎</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} onClick={() => { setSelected(r); setEditing(false) }} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover:opacity-80">
                      <td className="p-2 sm:p-3 font-medium truncate max-w-[100px]" style={{ color: 'var(--text)' }}>{r.nombre}</td>
                      <td className="p-2 sm:p-3 truncate max-w-[100px]" style={{ color: 'var(--text-secondary)' }}>{r.vehiculoNombre || '-'}</td>
                      <td className="p-2 sm:p-3"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                        background: r.estado === 'Completado' ? 'rgba(34,197,94,0.12)' : r.estado === 'Autorizado' ? 'rgba(59,130,246,0.12)' : r.estado === 'Bloqueado' ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)',
                        color: r.estado === 'Completado' ? '#22c55e' : r.estado === 'Autorizado' ? '#3b82f6' : r.estado === 'Bloqueado' ? '#ef4444' : '#eab308',
                      }}>{r.estado}</span></td>
                      <td className="p-2 sm:p-3 truncate max-w-[120px]" style={{ color: 'var(--text-secondary)' }}>{r.ubicacion || '-'}</td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.situacionComercial || '-'}</td>
                      <td className="p-2 sm:p-3"><span style={{ color: r.prioridad === 'Alta' ? '#ef4444' : r.prioridad === 'Media' ? '#eab308' : 'var(--text-secondary)' }}>{r.prioridad || '-'}</span></td>
                      <td className="p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{r.responsableNombre || '-'}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaProgramada)}</td>
                      <td className="text-right p-2 sm:p-3" style={{ color: 'var(--text-secondary)' }}>{fmtDate(r.fechaRealizada)}</td>
                      <td className="text-center p-2 sm:p-3" style={{ color: r.authFileName ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{r.authFileName ? '📎' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Modal detalle / edición */}
        {selected && !editing && (
          <DetailModal item={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} user={user} />
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

function DetailModal({ item, onClose, onEdit, user }: { item: LogItem; onClose: () => void; onEdit: () => void; user: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{item.nombre}</h2>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--accent-blue)' }}>✏️</button>
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
        <CommentsSection pageId={item.id} user={user} />
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
          <select value={editData.estado} onChange={e => setEditData({...editData, estado: e.target.value})} style={selectSx}>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <input value={editData.ubicacion} onChange={e => setEditData({...editData, ubicacion: e.target.value})} placeholder="Ubicación" style={selectSx} />
          <div className="grid grid-cols-2 gap-2">
            <select value={editData.situacionComercial} onChange={e => setEditData({...editData, situacionComercial: e.target.value})} style={selectSx}>
              {SITUACIONES.map(s => <option key={s || 'v'} value={s}>{s || 'Sin situación'}</option>)}
            </select>
            <select value={editData.prioridad} onChange={e => setEditData({...editData, prioridad: e.target.value})} style={selectSx}>
              {PRIORIDADES.map(p => <option key={p || 'v'} value={p}>{p || 'Sin prioridad'}</option>)}
            </select>
          </div>
          <select value={editData.responsableId} onChange={e => setEditData({...editData, responsableId: e.target.value})} style={selectSx}>
            <option value="">Sin responsable</option>
            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={editData.vehiculoId} onChange={e => setEditData({...editData, vehiculoId: e.target.value})} style={selectSx}>
            <option value="">Sin vehículo</option>
            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{vehLabel(v)}</option>)}
          </select>
          <textarea value={editData.observaciones} onChange={e => setEditData({...editData, observaciones: e.target.value})} placeholder="Observaciones" rows={3} style={{...selectSx, resize: 'vertical'}} />
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
          <input required placeholder="Nombre *" value={name} onChange={e => setName(e.target.value)} style={selectSx} />
          <select value={estado} onChange={e => setEstado(e.target.value)} style={selectSx}>
            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={selectSx} />
            <input placeholder="Ubicación" value={ubicacion} onChange={e => setUbicacion(e.target.value)} style={selectSx} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={sitCom} onChange={e => setSitCom(e.target.value)} style={selectSx}>
              <option value="">Sin situación</option>
              {SITUACIONES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={prioridad} onChange={e => setPrioridad(e.target.value)} style={selectSx}>
              <option value="">Sin prioridad</option>
              {PRIORIDADES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={respId} onChange={e => setRespId(e.target.value)} style={selectSx}>
              <option value="">Sin responsable</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={vehId} onChange={e => setVehId(e.target.value)} style={selectSx}>
              <option value="">Sin vehículo</option>
              {vehicles.map((v: any) => <option key={v.id} value={v.id}>{vehLabel(v)}</option>)}
            </select>
          </div>
          <textarea placeholder="Observaciones" value={obs} onChange={e => setObs(e.target.value)} rows={3} style={{...selectSx, resize: 'vertical'}} />
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
