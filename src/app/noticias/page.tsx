'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface LinkPreview {
  url: string
  title: string
  description: string
  image: string
  siteName: string
}

interface NoticiaItem {
  id: string
  titulo: string
  cuerpo: string
  link: string | null
  autorId: string | null
  fecha: string | null
  activo: boolean
  linkPreview: LinkPreview | null
}

interface EmployeeItem {
  id: string
  name: string
}

const LS_KEY = 'noticias_mi_nombre'
const VISTOS_KEY = 'noticias_vistos'

function getVistos(): Set<string> {
  try {
    const raw = localStorage.getItem(VISTOS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

function addVisto(id: string) {
  const vistos = getVistos()
  vistos.add(id)
  localStorage.setItem(VISTOS_KEY, JSON.stringify([...vistos]))
}

function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block mt-2 rounded overflow-hidden transition-opacity hover:opacity-80"
      style={{ border: '1px solid var(--border)', background: 'var(--bg)' }}
    >
      <div className="flex">
        {preview.image && (
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${preview.image})` }}
          />
        )}
        <div className="flex-1 min-w-0 p-2 sm:p-3">
          <p className="text-[11px] font-semibold leading-tight line-clamp-2" style={{ color: 'var(--text)' }}>
            {preview.title}
          </p>
          {preview.description && (
            <p className="text-[10px] leading-snug line-clamp-2 mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {preview.description}
            </p>
          )}
          <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {preview.siteName}
          </p>
        </div>
      </div>
    </a>
  )
}

function NoticiasInner() {
  const { dark } = useTheme()
  const [noticias, setNoticias] = useState<NoticiaItem[]>([])
  const [vistos, setVistos] = useState<Set<string>>(new Set())
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<NoticiaItem | null>(null)
  const [myId, setMyId] = useState('')

  const [showCrear, setShowCrear] = useState(false)
  const [newTitulo, setNewTitulo] = useState('')
  const [newCuerpo, setNewCuerpo] = useState('')
  const [newLink, setNewLink] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) setMyId(saved)
    setVistos(getVistos())
  }, [])

  const fetchNoticias = useCallback(async () => {
    try {
      const res = await fetch('/api/noticias')
      const json = await res.json()
      if (json.success) setNoticias(json.data)
    } catch {
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
    }
  }, [])

  useEffect(() => {
    fetchNoticias()
    fetchEmployees()
  }, [fetchNoticias, fetchEmployees])

  function handleEmployeeChange(id: string) {
    setMyId(id)
    if (id) {
      localStorage.setItem(LS_KEY, id)
    } else {
      localStorage.removeItem(LS_KEY)
    }
  }

  function getEmployeeName(id: string): string {
    return employees.find((e) => e.id === id)?.name || id.slice(0, 8)
  }

  function openNoticia(n: NoticiaItem) {
    setSelected(n)
    if (!vistos.has(n.id)) {
      addVisto(n.id)
      setVistos(new Set([...vistos, n.id]))
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/noticias/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setNoticias((prev) => prev.filter((n) => n.id !== id))
        setSelected(null)
      }
    } catch {
    }
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitulo.trim() || !newCuerpo.trim() || !myId) return
    setCreating(true)
    try {
      const res = await fetch('/api/noticias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: newTitulo.trim(), cuerpo: newCuerpo.trim(), autorId: myId, link: newLink.trim() || undefined }),
      })
      if (res.ok) {
        setNewTitulo('')
        setNewCuerpo('')
        setNewLink('')
        setShowCrear(false)
        fetchNoticias()
      }
    } catch {
    } finally {
      setCreating(false)
    }
  }

  function formatFecha(f: string | null): string {
    if (!f) return ''
    return new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>📢 Tablón de Noticias</h1>
          <div className="flex items-center gap-2">
            {myId && (
              <button
                onClick={() => setShowCrear(true)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded transition-opacity"
                style={{ background: 'var(--accent-blue)', color: '#fff' }}
              >
                + Nueva noticia
              </button>
            )}
            <DarkModeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>👤</span>
          <select
            value={myId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            className="text-[11px] sm:text-xs px-2 py-1.5 rounded outline-none appearance-none cursor-pointer"
            style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value="">Seleccionar empleado...</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {myId && (
            <button
              onClick={() => handleEmployeeChange('')}
              className="text-[11px] px-2 py-1 rounded font-medium transition-opacity hover:opacity-70"
              style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} style={{ width: '100%', height: 80 }} />
            ))}
          </div>
        ) : noticias.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-2xl">🎉</span>
            <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>No hay noticias aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {noticias.map((n) => (
              <button
                key={n.id}
                onClick={() => openNoticia(n)}
                className="card w-full text-left p-3 sm:p-4 cursor-pointer transition-all duration-150"
                style={{ opacity: vistos.has(n.id) ? 0.5 : 1 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs">🗞️</span>
                  <h2 className="text-[13px] sm:text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>
                    {n.titulo}
                  </h2>
                </div>
                <p className="text-[11px] leading-relaxed line-clamp-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                  {n.cuerpo}
                </p>
                {n.linkPreview && <LinkPreviewCard preview={n.linkPreview} />}
                <div className="flex items-center gap-2 text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>{getEmployeeName(n.autorId || '')}</span>
                  {n.fecha && <span>· {formatFecha(n.fecha)}</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
          >
            <div className="card w-full max-w-lg animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg">🗞️</span>
                <button onClick={() => setSelected(null)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                  ✕
                </button>
              </div>

              <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>{selected.titulo}</h2>

              <div className="flex items-center gap-2 text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                <span>{getEmployeeName(selected.autorId || '')}</span>
                {selected.fecha && <span>· {formatFecha(selected.fecha)}</span>}
              </div>

              <div className="text-[13px] leading-relaxed whitespace-pre-wrap mb-2" style={{ color: 'var(--text)' }}>
                {selected.cuerpo}
              </div>

              {selected.linkPreview && <LinkPreviewCard preview={selected.linkPreview} />}

              {selected.autorId === myId && (
                <button
                  onClick={() => handleArchive(selected.id)}
                  className="w-full text-[11px] font-semibold py-2 rounded mt-3"
                  style={{ background: 'var(--bg-pill)', color: 'var(--text)' }}
                >
                  🗑 Eliminar noticia
                </button>
              )}
            </div>
          </div>
        )}

        {showCrear && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowCrear(false) }}
          >
            <div className="card w-full max-w-md animate-fade-up p-5" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Nueva noticia</h3>
                <button onClick={() => setShowCrear(false)} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
                  ✕
                </button>
              </div>

              <form onSubmit={handleCrear} className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Título"
                    value={newTitulo}
                    onChange={(e) => setNewTitulo(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    required
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Cuerpo de la noticia..."
                    value={newCuerpo}
                    onChange={(e) => setNewCuerpo(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded outline-none resize-none min-h-[120px]"
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    required
                  />
                </div>
                <div>
                  <input
                    type="url"
                    placeholder="Link (opcional)"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="w-full text-[13px] px-3 py-2 rounded outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !newTitulo.trim() || !newCuerpo.trim()}
                  className="w-full text-[11px] font-semibold py-2 rounded min-h-[36px] transition-opacity disabled:opacity-40"
                  style={{ background: 'var(--accent-blue)', color: '#fff' }}
                >
                  {creating ? 'Publicando...' : '📢 Publicar'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function NoticiasPage() {
  return (
    <ThemeProvider>
      <NoticiasInner />
    </ThemeProvider>
  )
}
