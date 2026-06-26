'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

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

const STATE_TRANSITIONS: Record<string, string[]> = {
  'Sin empezar': ['En progreso', 'Bloqueada', 'Cancelada'],
  'En progreso': ['Bloqueada', 'Completada', 'Cancelada'],
  Bloqueada: ['En progreso', 'Cancelada'],
}

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

function TareasInner() {
  const { dark } = useTheme()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TaskItem | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

  const [filterArea, setFilterArea] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterEmployee, setFilterEmployee] = useState('')
  const [myName, setMyName] = useState('')
  const [vista, setVista] = useState<'kanban' | 'gantt'>('kanban')

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

  useEffect(() => {
    fetchTasks()
    fetchEmployees()
  }, [fetchTasks, fetchEmployees])

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
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1">
              {columns.map((col) => (
                <div key={col.state} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 180, flex: 1 }}>
                  <div className="flex items-center gap-1.5 mb-2 sm:mb-3">
                    <span className="text-xs">{STATE_ICONS[col.state]}</span>
                    <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      {col.state}
                    </h3>
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>
                      {col.tasks.length}
                    </span>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    {col.tasks.length === 0 ? (
                      <p className="text-[11px] py-4 text-center" style={{ color: 'var(--text-muted)' }}>Vacío</p>
                    ) : (
                      col.tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => setSelected(task)}
                          className="vehicle-card w-full text-left cursor-pointer transition-all duration-150"
                        >
                          <p className="text-[11px] sm:text-xs font-semibold leading-tight mb-1.5 line-clamp-2" style={{ color: 'var(--text)' }}>
                            {task.name}
                          </p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{
                                background: `${PRIORITY_COLORS[task.priority]}20`,
                                color: PRIORITY_COLORS[task.priority],
                              }}
                            >
                              {task.priority}
                            </span>
                            {task.area && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>
                                {task.area}
                              </span>
                            )}
                            {task.tipoTarea && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                                {task.tipoTarea}
                              </span>
                            )}
                            {task.areaNegocio && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                                {task.areaNegocio}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          >
            <div className="card w-full max-w-sm animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg">{STATE_ICONS[selected.state]}</span>
                <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                  ✕
                </button>
              </div>

              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>{selected.name}</h2>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Prioridad:</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      background: `${PRIORITY_COLORS[selected.priority]}20`,
                      color: PRIORITY_COLORS[selected.priority],
                    }}
                  >
                    {selected.priority}
                  </span>
                </div>
                {selected.area && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Departamento:</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{selected.area}</span>
                  </div>
                )}
                {selected.type && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Tipo:</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{selected.type}</span>
                  </div>
                )}
                {selected.tipoTarea && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Tipo tarea:</span>
                    <span className="text-[10px]" style={{ color: '#3b82f6' }}>{selected.tipoTarea}</span>
                  </div>
                )}
                {selected.areaNegocio && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Área negocio:</span>
                    <span className="text-[10px]" style={{ color: '#8b5cf6' }}>{selected.areaNegocio}</span>
                  </div>
                )}
                {selected.deadline && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Vence:</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(selected.deadline).toLocaleDateString('es')}
                    </span>
                  </div>
                )}
                {selected.descripcion && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <span className="text-[10px] font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Descripción:</span>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{selected.descripcion}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                {(STATE_TRANSITIONS[selected.state] || []).map((ns) => (
                  <button
                    key={ns}
                    onClick={() => handleMove(selected.id, ns)}
                    disabled={moving === selected.id}
                    className="w-full text-[11px] font-semibold py-2 rounded min-h-[36px] transition-opacity disabled:opacity-40"
                    style={{ background: 'var(--accent-blue)', color: '#fff' }}
                  >
                    {moving === selected.id ? '...' : `${STATE_ICONS[ns] || '→'} Mover a ${ns}`}
                  </button>
                ))}
                <button
                  onClick={() => handleArchive(selected.id)}
                  className="w-full text-[11px] font-semibold py-2 rounded min-h-[36px]"
                  style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}
                >
                  🗑 Limpiar
                </button>
              </div>
            </div>
          </div>
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
