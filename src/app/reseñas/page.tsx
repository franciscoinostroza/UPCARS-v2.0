'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface ReviewItem {
  id: string
  autor: string
  puntuacion: number | null
  comentario: string
  fecha: string | null
  estado: string
  textoRespuesta: string
  enlace: string | null
}

interface ReviewsData {
  reviews: ReviewItem[]
  kpis: {
    total: number
    promedio: number
    distribucion: { estrellas: number; cantidad: number }[]
    pendientes: number
    respondidas: number
  }
}

function fmtDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

function Stars({ n }: { n: number }) {
  return <span>{'⭐'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}</span>
}

function ReseñasInner() {
  const { dark } = useTheme()
  const [data, setData] = useState<ReviewsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStars, setFilterStars] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 animate-fade-up">
            <Skeleton style={{ width: 200, height: 22 }} />
            <Skeleton style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
          <div className="flex gap-2 mb-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
            {[1,2,3].map(i => <Skeleton key={i} className="flex-1" style={{ height: 60 }} />)}
          </div>
          <Skeleton style={{ height: 300 }} />
        </div>
      </div>
    )
  }

  const k = data?.kpis
  const reviews = data?.reviews || []
  const filtered = filterStars > 0 ? reviews.filter(r => Math.round(r.puntuacion ?? 0) === filterStars) : reviews

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-5xl mx-auto p-3 sm:p-6 lg:p-8">

        <div className="flex items-center justify-between mb-4 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>⭐ Reseñas de Google</h1>
          <DarkModeToggle />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {[
            { icon: '📝', label: 'Total reseñas', value: k?.total ?? 0 },
            { icon: '⭐', label: 'Promedio', value: k?.promedio ?? '-' },
            { icon: '⏳', label: 'Pendientes', value: k?.pendientes ?? 0 },
            { icon: '✅', label: 'Respondidas', value: k?.respondidas ?? 0 },
          ].map(s => (
            <div key={s.label} className="card flex flex-col gap-1 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{s.icon}</span>
                <span className="text-[10px] sm:text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              </div>
              <p className="text-sm sm:text-base font-bold stat-value" style={{ color: 'var(--text)' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Distribution */}
        {k && (
          <div className="flex items-center gap-2 mb-4 flex-wrap animate-fade-up" style={{ animationDelay: '75ms' }}>
            <button onClick={() => setFilterStars(0)} className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: filterStars === 0 ? 'var(--bg-pill)' : 'transparent', color: filterStars === 0 ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
              Todas ({k.total})
            </button>
            {k.distribucion.filter(d => d.cantidad > 0).map(d => (
              <button key={d.estrellas} onClick={() => setFilterStars(d.estrellas)} className="px-2.5 py-1 text-[10px] sm:text-xs rounded font-medium transition-all" style={{ background: filterStars === d.estrellas ? 'var(--bg-pill)' : 'transparent', color: filterStars === d.estrellas ? 'var(--text)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {d.estrellas}⭐ ({d.cantidad})
              </button>
            ))}
          </div>
        )}

        {/* Reviews */}
        {filtered.length === 0 ? (
          <div className="card p-8 text-center animate-fade-up">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{reviews.length === 0 ? 'No hay reseñas sincronizadas aún. Configurá Google My Business para empezar a recibirlas.' : 'No hay reseñas con ese filtro.'}</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {filtered.map(r => (
              <div key={r.id} className="card p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--text)' }}>{r.autor}</span>
                      <span className="text-xs"><Stars n={r.puntuacion ?? 0} /></span>
                      {r.estado && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                          background: r.estado === 'Respondida' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)',
                          color: r.estado === 'Respondida' ? '#22c55e' : '#eab308',
                        }}>{r.estado}</span>
                      )}
                    </div>
                    {r.comentario && (
                      <p className="text-[11px] sm:text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {r.comentario.length > 300 ? r.comentario.slice(0, 300) + '...' : r.comentario}
                      </p>
                    )}
                    {r.textoRespuesta && (
                      <div className="mt-2 pl-3 border-l-2" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-[10px] sm:text-[11px] italic" style={{ color: 'var(--text-muted)' }}>
                          {r.textoRespuesta}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{fmtDate(r.fecha)}</span>
                    {r.enlace && (
                      <a href={r.enlace} target="_blank" rel="noopener noreferrer" className="text-[10px] hover:opacity-70" style={{ color: 'var(--accent-blue)' }}>
                        Abrir →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

export default function ReseñasPage() {
  return (
    <ThemeProvider>
      <ReseñasInner />
    </ThemeProvider>
  )
}
