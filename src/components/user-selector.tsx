'use client'

import { useState, useEffect } from 'react'

export function useUser() {
  const [user, setUser] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('upcars_user')
    if (saved) setUser(saved)
  }, [])

  function saveUser(name: string) {
    localStorage.setItem('upcars_user', name)
    setUser(name)
  }

  function clearUser() {
    localStorage.removeItem('upcars_user')
    setUser(null)
  }

  return { user, saveUser, clearUser }
}

export function UserSelectorModal({ employees, user, onSave, onClose }: {
  employees: { id: string; name: string }[]
  user: string | null
  onSave: (name: string) => void
  onClose?: () => void
}) {
  const [selected, setSelected] = useState(user || '')

  if (user) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="card p-5 animate-fade-up" style={{ background: 'var(--bg-card)', maxWidth: 320, width: '100%' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>👤 ¿Quién sos?</h2>
        <p className="text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>Elegí tu nombre para firmar comentarios</p>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full text-xs px-2 py-1.5 rounded outline-none mb-3"
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}>
          <option value="">Seleccionar...</option>
          {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
        </select>
        <button onClick={() => { if (selected) { onSave(selected); onClose?.() } }}
          disabled={!selected}
          className="w-full text-[11px] font-semibold py-2 rounded disabled:opacity-40"
          style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          Guardar
        </button>
      </div>
    </div>
  )
}
