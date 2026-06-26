'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core'

interface TaskItem {
  id: string
  name: string
  vehicleId: string | null
  responsibleIds: string[]
  priority: 'Alta' | 'Media' | 'Baja'
  state: 'Sin empezar' | 'En progreso' | 'Bloqueada' | 'Completada' | 'Cancelada'
  deadline: string | null
  area: string
  type: string
  tipoTarea: string
  areaNegocio: string
  descripcion: string
}

interface EmployeeItem {
  id: string
  name: string
  role: string
  department: string
}

const ALL_STATES = ['Sin empezar', 'En progreso', 'Bloqueada', 'Completada', 'Cancelada'] as const

const STATE_ICONS: Record<string, string> = {
  'Sin empezar': '⏳',
  'En progreso': '🔄',
  Bloqueada: '🚫',
  Completada: '✅',
  Cancelada: '❌',
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta: 'var(--accent-red)',
  Media: 'var(--accent-yellow)',
  Baja: 'var(--accent-green)',
}

const AREAS = ['Gerencia', 'Administración', 'Ventas', 'Taller', 'Logística', 'Marketing']

const LS_KEY = 'tareas_mi_nombre'

function FilterSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-[11px] sm:text-xs px-2 py-1.5 rounded outline-none appearance-none cursor-pointer"
      style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', minWidth: 0 }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 180, flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '60vh', outline: isOver ? '2px solid var(--accent-blue)' : 'none', outlineOffset: -2 }}>
      {children}
    </div>
  )
}

function DraggableTaskCard({ task, onClick }: { task: TaskItem; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.8 } : {}

  return (
    <button ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick}
      className="vehicle-card w-full text-left cursor-grab active:cursor-grabbing transition-shadow duration-150 touch-none"
    >
      <p className="text-[11px] sm:text-xs font-semibold leading-tight mb-1.5 line-clamp-2" style={{ color: 'var(--text)' }}>
        {task.name}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
        {task.area && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{task.area}</span>}
        {task.tipoTarea && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>{task.tipoTarea}</span>}
        {task.areaNegocio && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>{task.areaNegocio}</span>}
      </div>
    </button>
  )
}

function TaskDetailModal({ task, employees, onClose, onMove, onArchive, onUpdate }: {
  task: TaskItem
  employees: { id: string; name: string }[]
  onClose: () => void
  onMove: (id: string, state: string) => void
  onArchive: (id: string) => void
  onUpdate: (id: string, data: Partial<TaskItem>) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(task.name)
  const [priority, setPriority] = useState(task.priority)
  const [area, setArea] = useState(task.area)
  const [type, setType] = useState(task.type)
  const [tipoTarea, setTipoTarea] = useState(task.tipoTarea)
  const [areaNegocio, setAreaNegocio] = useState(task.areaNegocio)
  const [responsableId, setResponsableId] = useState(task.responsibleIds[0] || '')
  const [deadline, setDeadline] = useState(task.deadline || '')
  const [descripcion, setDescripcion] = useState(task.descripcion || '')

  const AREAS = ['Gerencia', 'Administración', 'Ventas', 'Taller', 'Logística', 'Marketing']
  const TIPOS = ['Personal', 'Grupal', 'Departamental', 'Proyecto']
  const TIPOS_TAREA = ['Mejora interna', 'Marketing', 'Nuevo negocio', 'Visitas', 'Administrativo', 'Otro']
  const AREAS_NEGOCIO = ['Taller', 'V.O', 'Renting', 'Marketing', 'Growth', 'General', 'RRHH']
  const inputStyle = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

  async function handleSave() {
    const data: any = {}
    if (name !== task.name) data.name = name.trim()
    if (priority !== task.priority) data.priority = priority
    if (area !== task.area) data.area = area
    if (type !== task.type) data.type = type || undefined
    if (tipoTarea !== task.tipoTarea) data.tipoTarea = tipoTarea || undefined
    if (areaNegocio !== task.areaNegocio) data.areaNegocio = areaNegocio || undefined
    if (responsableId !== (task.responsibleIds[0] || '')) data.responsibleIds = responsableId ? [responsableId] : []
    if (deadline !== task.deadline) data.deadline = deadline || undefined
    if (descripcion !== task.descripcion) data.descripcion = descripcion.trim() || undefined

    if (Object.keys(data).length === 0) { setEditing(false); return }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        onUpdate(task.id, { ...data, priority: data.priority || task.priority } as any)
        setEditing(false)
      }
    } catch {}
  }

  if (editing) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>✏️ Editar tarea</h2>
            <button onClick={() => setEditing(false)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            <div className="grid grid-cols-2 gap-2">
              <select value={priority} onChange={e => setPriority(e.target.value as any)} style={inputStyle}>
                <option value="Alta">🔴 Alta</option><option value="Media">🟡 Media</option><option value="Baja">🟢 Baja</option>
              </select>
              <select value={area} onChange={e => setArea(e.target.value)} style={inputStyle}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={type} onChange={e => setType(e.target.value)} style={inputStyle}>
                <option value="">Tipo</option>{TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} style={inputStyle}>
                <option value="">Tipo tarea</option>{TIPOS_TAREA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={areaNegocio} onChange={e => setAreaNegocio(e.target.value)} style={inputStyle}>
                <option value="">Área negocio</option>{AREAS_NEGOCIO.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={responsableId} onChange={e => setResponsableId(e.target.value)} style={inputStyle}>
                <option value="">Responsable</option>{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}>Cancelar</button>
              <button onClick={handleSave} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--accent-blue)', color: '#fff' }}>💾 Guardar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card w-full max-w-sm animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg">{STATE_ICONS[task.state]}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { setName(task.name); setPriority(task.priority); setArea(task.area); setType(task.type); setTipoTarea(task.tipoTarea); setAreaNegocio(task.areaNegocio); setResponsableId(task.responsibleIds[0] || ''); setDeadline(task.deadline || ''); setDescripcion(task.descripcion || ''); setEditing(true) }} className="text-[10px] px-2 py-1 rounded transition-opacity hover:opacity-70 cursor-pointer" style={{ color: 'var(--accent-blue)' }}>✏️</button>
            <button onClick={onClose} className="text-sm px-2 py-1 rounded transition-opacity hover:opacity-70 cursor-pointer" style={{ color: 'var(--text-muted)' }}>✕</button>
          </div>
        </div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{task.name}</h2>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Prioridad:</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[task.priority]}20`, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
          </div>
          {task.area && <div className="flex items-center gap-2"><span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Departamento:</span><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{task.area}</span></div>}
          {task.type && <div className="flex items-center gap-2"><span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Tipo:</span><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{task.type}</span></div>}
          {task.tipoTarea && <div className="flex items-center gap-2"><span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Tipo tarea:</span><span className="text-[10px]" style={{ color: '#3b82f6' }}>{task.tipoTarea}</span></div>}
          {task.areaNegocio && <div className="flex items-center gap-2"><span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Área negocio:</span><span className="text-[10px]" style={{ color: '#8b5cf6' }}>{task.areaNegocio}</span></div>}
          {task.deadline && <div className="flex items-center gap-2"><span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Vence:</span><span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{new Date(task.deadline).toLocaleDateString('es')}</span></div>}
          {task.descripcion && <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}><span className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Descripción:</span><p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{task.descripcion}</p></div>}
        </div>
         <button onClick={() => onArchive(task.id)}
           className="w-full text-[11px] font-semibold py-2 rounded min-h-[36px] transition-opacity hover:opacity-70 cursor-pointer"
           style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}
         >🗑 Limpiar</button>
      </div>
    </div>
  )
}

function CreateTaskModal({ employees, vehicles, onClose, onCreate }: {
  employees: { id: string; name: string }[]
  vehicles: { id: string; name: string }[]
  onClose: () => void
  onCreate: (data: any) => void
}) {
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [priority, setPriority] = useState('Media')
  const [type, setType] = useState('')
  const [tipoTarea, setTipoTarea] = useState('')
  const [areaNegocio, setAreaNegocio] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const AREAS = ['Gerencia', 'Administración', 'Ventas', 'Taller', 'Logística', 'Marketing']
  const TIPOS = ['Personal', 'Grupal', 'Departamental', 'Proyecto']
  const TIPOS_TAREA = ['Mejora interna', 'Marketing', 'Nuevo negocio', 'Visitas', 'Administrativo', 'Otro']
  const AREAS_NEGOCIO = ['Taller', 'V.O', 'Renting', 'Marketing', 'Growth', 'General', 'RRHH']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !area) return
    setSubmitting(true)
    await onCreate({
      name: name.trim(),
      area,
      priority,
      type: type || undefined,
      tipoTarea: tipoTarea || undefined,
      areaNegocio: areaNegocio || undefined,
      responsableId: responsableId || undefined,
      vehicleId: vehicleId || undefined,
      deadline: deadline || undefined,
      descripcion: descripcion.trim() || undefined,
    })
    setSubmitting(false)
  }

  const selectStyle = { background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 11, padding: '6px 8px', borderRadius: 6, width: '100%', outline: 'none' }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>➕ Nueva tarea</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nombre de la tarea *" value={name} onChange={e => setName(e.target.value)} style={{ ...selectStyle, fontSize: 13 }} />
          <div className="grid grid-cols-2 gap-2">
            <select required value={area} onChange={e => setArea(e.target.value)} style={selectStyle}>
              <option value="">Departamento *</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={priority} onChange={e => setPriority(e.target.value)} style={selectStyle}>
              <option value="Media">Prioridad: Media</option>
              <option value="Alta">🔴 Alta</option>
              <option value="Baja">🟢 Baja</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
              <option value="">Tipo</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value)} style={selectStyle}>
              <option value="">Tipo de tarea</option>
              {TIPOS_TAREA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={areaNegocio} onChange={e => setAreaNegocio(e.target.value)} style={selectStyle}>
              <option value="">Área de negocio</option>
              {AREAS_NEGOCIO.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={selectStyle} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={responsableId} onChange={e => setResponsableId(e.target.value)} style={selectStyle}>
              <option value="">Responsable</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={selectStyle}>
              <option value="">Vehículo</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <textarea placeholder="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} style={{ ...selectStyle, resize: 'vertical' }} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 text-[11px] font-semibold py-2 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}>Cancelar</button>
            <button type="submit" disabled={submitting || !name.trim() || !area} className="flex-1 text-[11px] font-semibold py-2 rounded transition-opacity disabled:opacity-40" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
              {submitting ? '...' : '✅ Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TareasInner() {
  const { dark } = useTheme()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [vehicles, setVehicles] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TaskItem | null>(null)
  const [moving, setMoving] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const [filterArea, setFilterArea] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [myName, setMyName] = useState('')
  const [vista, setVista] = useState<'kanban' | 'gantt'>('kanban')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      setMyName(saved)
      setFilterEmployee(saved)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      const json = await res.json()
      if (json.success) setTasks(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees')
      const json = await res.json()
      if (json.success) setEmployees(json.data)
    } catch {
      // silent
    }
  }, [])

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles?list=true')
      const json = await res.json()
      if (json.success) setVehicles(json.data)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
    fetchVehicles()
  }, [fetchTasks, fetchEmployees, fetchVehicles])

  const filteredTasks = tasks.filter((t) => {
    if (filterArea && t.area !== filterArea) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterEmployee && !t.responsibleIds.includes(filterEmployee)) return false
    return true
  })

  const columns = ALL_STATES.map((state) => ({
    state,
    tasks: filteredTasks.filter((t) => t.state === state),
  }))

  function handleEmployeeChange(id: string) {
    setFilterEmployee(id)
    setMyName(id)
    if (id) {
      localStorage.setItem(LS_KEY, id)
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }

  async function handleMove(taskId: string, newState: string) {
    setMoving(taskId)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      })
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, state: newState as any } : t))
        )
      }
    } catch {
      // silent
    } finally {
      setMoving(null)
      setSelected(null)
    }
  }

  async function handleArchive(taskId: string) {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId))
        setSelected(null)
      }
    } catch {
      // silent
    }
  }

  function handleDragEnd(event: any) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const task = tasks.find(t => t.id === active.id)
    if (!task) return

    const newState = over.id as string
    const validStates = ['Sin empezar', 'En progreso', 'Bloqueada', 'Completada', 'Cancelada']
    if (!validStates.includes(newState) || newState === task.state) return

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, state: newState as any } : t))
    fetch(`/api/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: newState }) }).catch(() => {})
  }

  async function handleCreateTask(formData: any) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        setShowCreate(false)
        fetchTasks()
      }
    } catch {
      // silent
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 animate-fade-up">
          <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📋 Tareas del Equipo</h1>
          <DarkModeToggle />
        </div>

        {!loading && (
          <div className="flex items-center gap-2 mb-2 animate-fade-up" style={{ animationDelay: '40ms' }}>
            <button onClick={() => setVista('kanban')} className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'kanban' ? 'var(--bg-pill)' : 'transparent', color: vista === 'kanban' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📋 Kanban</button>
            <button onClick={() => setVista('gantt')} className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: vista === 'gantt' ? 'var(--bg-pill)' : 'transparent', color: vista === 'gantt' ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>📊 Gantt</button>
            <button onClick={() => setShowCreate(true)} className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: 'var(--bg-pill)', color: 'var(--accent-blue)', border: '1px solid var(--border)' }}>➕ Nueva tarea</button>
          </div>
        )}

        {!loading && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
            <FilterSelect
              label="Departamento"
              value={filterArea}
              onChange={setFilterArea}
              options={[{ value: '', label: '📂 Todos los departamentos' }, ...AREAS.map((a) => ({ value: a, label: a }))]}
            />
            <FilterSelect
              label="Prioridad"
              value={filterPriority}
              onChange={setFilterPriority}
              options={[
                { value: '', label: '🏷️ Todas' },
                { value: 'Alta', label: '🔴 Alta' },
                { value: 'Media', label: '🟡 Media' },
                { value: 'Baja', label: '🟢 Baja' },
              ]}
            />
            <FilterSelect
              label="Responsable"
              value={filterEmployee}
              onChange={handleEmployeeChange}
              options={[
                { value: '', label: '👥 Todos' },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
            />
            {myName && (
              <button
                onClick={() => {
                  setFilterEmployee('')
                  handleEmployeeChange('')
                }}
                className="text-[11px] px-2 py-1.5 rounded font-medium transition-opacity hover:opacity-70"
                style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex gap-1.5 sm:gap-2" style={{ animationDelay: '50ms' }}>
            {[1,2,3].map((i) => (
              <div key={i} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1 }}>
                <Skeleton style={{ width: '60%', height: 14, marginBottom: 12 }} />
                <div className="space-y-2">
                  {[1,2,3,4].map((j) => (
                    <Skeleton key={j} style={{ width: '100%', height: 72 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {!myName && employees.length > 0 && (
              <div className="mb-3 p-3 rounded animate-fade-up flex items-center gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <span className="text-sm">👤</span>
                <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>¿Quién eres? Selecciona tu nombre para ver tus tareas:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleEmployeeChange(e.target.value)
                  }}
                  className="text-[11px] sm:text-xs px-2 py-1 rounded outline-none font-medium ml-auto"
                  style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <option value="">Elegir...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            )}

            {vista === 'gantt' ? (
              <div className="card p-3 sm:p-4" style={{ overflowX: 'auto' }}>
                {(() => {
                  const now = new Date()
                  const tasksWithDeadline = filteredTasks.filter(t => t.deadline)
                  if (tasksWithDeadline.length === 0) return <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No hay tareas con fecha límite para mostrar en Gantt</p>

                  const dates = tasksWithDeadline.map(t => new Date(t.deadline!))
                  const minDate = new Date(Math.min(...dates.map(d => d.getTime()), now.getTime()))
                  const maxDate = new Date(Math.max(...dates.map(d => d.getTime()), now.getTime()))
                  const totalDays = Math.max(Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)), 1) + 1
                  const dayWidth = Math.max(30, Math.min(60, 600 / totalDays))

                  const days = Array.from({ length: totalDays }, (_, i) => {
                    const d = new Date(minDate)
                    d.setDate(d.getDate() + i)
                    return d
                  })

                  return (
                    <div>
                      <div className="flex items-end mb-1" style={{ marginLeft: 160 }}>
                        {days.filter((_, i) => i % Math.max(1, Math.floor(totalDays / 15)) === 0).map(d => (
                          <span key={d.toISOString()} className="text-[9px] font-medium text-center" style={{ width: dayWidth * (totalDays / 15), color: 'var(--text-muted)', flexShrink: 0 }}>
                            {d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        ))}
                      </div>
                      {tasksWithDeadline.map(t => {
                        const start = new Date(t.deadline!)
                        const startOffset = Math.max(0, Math.round((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)))
                        const barWidth = 1
                        const barLeft = startOffset * dayWidth
                        return (
                          <div key={t.id} className="flex items-center gap-2 py-1" style={{ minHeight: 24 }}>
                            <span className="text-[10px] sm:text-xs truncate font-medium" style={{ width: 155, flexShrink: 0, color: 'var(--text)' }} title={t.name}>
                              {t.name}
                            </span>
                            <div style={{ position: 'relative', height: 18, flex: 1, minWidth: 200 }}>
                              <div style={{ position: 'absolute', left: barLeft, width: dayWidth, height: 14, borderRadius: 3, opacity: 0.85, background: t.priority === 'Alta' ? '#ef4444' : t.priority === 'Media' ? '#eab308' : '#22c55e' }} title={`${t.name} - Vence: ${t.deadline}`} />
                              {(() => {
                                const todayLeft = Math.round((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth
                                if (todayLeft > 0 && todayLeft < totalDays * dayWidth) {
                                  return <div style={{ position: 'absolute', left: todayLeft, top: 0, width: 1.5, height: '100%', background: 'var(--accent-red)', opacity: 0.4 }} />
                                }
                                return null
                              })()}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
              {columns.map((col) => (
                <DroppableColumn key={col.state} id={col.state}>
                  <div className="flex items-center gap-1.5 mb-2 sm:mb-3 shrink-0">
                    <span className="text-xs">{STATE_ICONS[col.state]}</span>
                    <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {col.state}
                    </h3>
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>
                      {col.tasks.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 overflow-y-auto flex-1" style={{ minHeight: 60 }}>
                    {col.tasks.length === 0 ? (
                      <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                    ) : (
                      col.tasks.map((task) => (
                        <DraggableTaskCard key={task.id} task={task} onClick={() => setSelected(task)} />
                      ))
                    )}
                  </div>
                </DroppableColumn>
              ))}
            </div>
            </DndContext>
            )}
          </>
        )}

        {/* Create task modal */}
        {showCreate && (
          <CreateTaskModal
            employees={employees}
            vehicles={vehicles}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateTask}
          />
        )}

        {selected && (
          <TaskDetailModal
            task={selected}
            employees={employees}
            onClose={() => setSelected(null)}
            onMove={handleMove}
            onArchive={handleArchive}
            onUpdate={(id, data) => {
              setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } as TaskItem : t))
              setSelected(prev => prev && prev.id === id ? { ...prev, ...data } as TaskItem : prev)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default function TareasPage() {
  return (
    <ThemeProvider>
      <TareasInner />
    </ThemeProvider>
  )
}
