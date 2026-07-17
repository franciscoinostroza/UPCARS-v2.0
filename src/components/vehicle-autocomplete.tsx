'use client'

import { useState, useRef, useEffect } from 'react'

function vehLabel(v: any): string {
  return v.matricula
    ? `${v.matricula} — ${v.brand} ${v.model} (${v.year || '—'})`
    : v.name || v.id
}

interface VehicleAutocompleteProps {
  vehicles: { id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string }[]
  value: string
  onChange: (id: string) => void
  label: string
  placeholder?: string
  required?: boolean
  error?: string
}

export default function VehicleAutocomplete({
  vehicles, value, onChange, label, placeholder, required, error,
}: VehicleAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = vehicles.find(v => v.id === value)

  useEffect(() => {
    if (selected && !query) setQuery(vehLabel(selected))
  }, [selected, query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = query.trim()
    ? vehicles.filter(v => {
        const label = vehLabel(v).toLowerCase()
        const q = query.toLowerCase()
        return label.includes(q) || (v.matricula || '').toLowerCase().includes(q)
      })
    : vehicles

  function handleSelect(id: string) {
    const v = vehicles.find(x => x.id === id)
    if (v) setQuery(vehLabel(v))
    onChange(id)
    setOpen(false)
    setHighlightIdx(-1)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setOpen(true)
    setHighlightIdx(-1)
    if (e.target.value === '') onChange('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && highlightIdx >= 0 && filtered[highlightIdx]) {
      e.preventDefault()
      handleSelect(filtered[highlightIdx].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlightIdx(-1)
    }
  }

  function handleFocus() {
    if (!query) { setOpen(true); setQuery('') }
    else if (!selected) setOpen(true)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: error ? '#ef4444' : 'var(--text-muted)' }}>{label}</p>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder || 'Escribí para buscar...'}
        required={required}
        style={{
          width: '100%', fontSize: 11, padding: '6px 8px', borderRadius: 6,
          background: 'var(--bg-card)', color: 'var(--text)',
          border: error ? '1px solid #ef4444' : '1px solid var(--border)',
          outline: 'none',
        }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          maxHeight: 200, overflowY: 'auto', borderRadius: 6, marginTop: 2,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 10, padding: 8, color: 'var(--text-muted)', textAlign: 'center' }}>Sin resultados</p>
          ) : filtered.map((v, i) => {
            const selected = v.id === value
            const highlighted = i === highlightIdx
            return (
              <div key={v.id} onClick={() => handleSelect(v.id)}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  padding: '6px 8px', cursor: 'pointer', fontSize: 11,
                  background: highlighted ? 'var(--bg-pill)' : selected ? 'var(--bg-pill)' : 'transparent',
                  color: 'var(--text)',
                  borderBottom: '1px solid var(--border)',
                }}>
                {vehLabel(v)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
