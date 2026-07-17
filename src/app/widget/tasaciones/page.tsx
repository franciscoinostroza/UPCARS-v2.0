'use client'

import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from '../../dashboard/theme-context'
import { stateColor, priorityColor } from '@/lib/colors'
import { fmtDate } from '@/lib/dates'

function WidgetInner() {
  const { dark } = useTheme()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasaciones')
      .then(r => r.json())
      .then(res => { if (res.success) setRecords(res.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const estados = ['Sin empezar', 'Seguimiento', 'Vendido', 'Desiste compra']
  const counts = estados.map(est => ({ estado: est, count: records.filter(r => r.estado === est).length }))
  const urgentes = [...records]
    .filter(r => r.estado !== 'Vendido' && r.estado !== 'Desiste compra')
    .sort((a, b) => (a.plazo || 'Z') > (b.plazo || 'Z') ? 1 : -1)
    .slice(0, 5)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: 16 }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Tasaciones</span>
          <a href="/tasaciones?token=c19182151726790aa5ee9bf2352e1efaaccc3569113d9e7883543057b6713cc8" target="_blank"
            style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--accent-blue)', textDecoration: 'none' }}>
            Ver todas →
          </a>
        </div>

        {loading ? (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Cargando...</p>
        ) : records.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Sin tasaciones</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {counts.map(({ estado, count }) => {
                const c = stateColor(estado)
                return count > 0 ? (
                  <span key={estado} style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: c.bg, color: c.text }}>
                    {estado}: {count}
                  </span>
                ) : null
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {urgentes.map(t => {
                const ec = stateColor(t.estado)
                const pc = priorityColor(t.prioridad)
                const overdue = t.plazo && new Date(t.plazo) < new Date()
                return (
                  <div key={t.id}
                    style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '10px 12px', borderLeft: `3px solid ${ec.text}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ec.text, marginTop: 4, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.nombre}</span>
                        {t.prioridad && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: pc.bg, color: pc.text }}>{t.prioridad}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 3, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                        {t.responsableNombre && <span>👤 {t.responsableNombre}</span>}
                        {t.plazo && <span style={{ color: overdue ? '#ef4444' : 'inherit' }}>📅 {fmtDate(t.plazo)}</span>}
                        {t.tipoTarea?.length > 0 && <span>{t.tipoTarea.slice(0, 2).join(', ')}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TasacionesWidgetPage() {
  return (
    <ThemeProvider>
      <WidgetInner />
    </ThemeProvider>
  )
}
