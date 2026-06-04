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
}

const ACTIVE_STATES = ['Sin empezar', 'En progreso', 'Bloqueada'] as const

const STATE_ICONS: Record<string, string> = {
  'Sin empezar': '⏳',
  'En progreso': '🔄',
  Bloqueada: '🚫',
}

const PRIORITY_COLORS: Record<string, string> = {
  Alta: 'var(--accent-red)',
  Media: 'var(--accent-yellow)',
  Baja: 'var(--accent-green)',
}

const STATE_TRANSITIONS: Record<string, string[]> = {
  'Sin empezar': ['En progreso', 'Bloqueada'],
  'En progreso': ['Bloqueada', 'Completada'],
  Bloqueada: ['En progreso'],
}

function TareasInner() {
  const { dark } = useTheme()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TaskItem | null>(null)
  const [moving, setMoving] = useState<string | null>(null)

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

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const activeTasks = tasks.filter((t) => ACTIVE_STATES.includes(t.state as any))

  const columns = ACTIVE_STATES.map((state) => ({
    state,
    tasks: activeTasks.filter((t) => t.state === state),
  }))

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

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📋 Tareas del Equipo</h1>
          <DarkModeToggle />
        </div>

        {loading ? (
          <div className="flex gap-1.5 sm:gap-2 animate-fade-up" style={{ animationDelay: '50ms' }}>
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
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1" style={{ animationDelay: '100ms' }}>
            {columns.map((col) => (
              <div key={col.state} className="pipeline-column p-2 sm:p-3" style={{ minWidth: 200, flex: 1 }}>
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
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
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
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Área:</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{selected.area}</span>
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
