'use client'

import { useState, useEffect, useCallback } from 'react'

interface CommentItem {
  id: string
  discussionId: string
  text: string
  authorName: string
  createdTime: string
}

function fmtCommentDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

export default function CommentsSection({ pageId, user }: { pageId: string; user: string | null }) {
  const [comments, setComments] = useState<CommentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?pageId=${pageId}`)
      const json = await res.json()
      if (json.success) setComments(json.data)
    } catch {} finally { setLoading(false) }
  }, [pageId])

  useEffect(() => { fetchComments() }, [fetchComments])

  async function sendComment() {
    if (!text.trim() || !user || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, text: text.trim(), authorName: user }),
      })
      const json = await res.json()
      if (json.success) {
        setText('')
        setComments(prev => [...prev, { id: json.data.id, discussionId: '', text: text.trim(), authorName: user, createdTime: new Date().toISOString() }])
      }
    } catch {} finally { setSending(false) }
  }

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>💬 Comentarios</span>
        {comments.length > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-muted)' }}>{comments.length}</span>
        )}
      </div>

      <div className="space-y-1.5 mb-2 max-h-[150px] overflow-y-auto">
        {loading ? (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
        ) : comments.length === 0 ? (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Sin comentarios</p>
        ) : comments.map(c => (
          <div key={c.id} className="text-[10px] leading-relaxed">
            <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{fmtCommentDate(c.createdTime)} · {c.authorName}:</span>
            <span style={{ color: 'var(--text)' }}> {c.text}</span>
          </div>
        ))}
      </div>

      {user && (
        <div className="flex gap-1.5">
          <input
            value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
            placeholder="Escribe un comentario..."
            className="flex-1 text-[10px] px-2 py-1.5 rounded outline-none"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
          <button onClick={sendComment} disabled={!text.trim() || sending}
            className="text-[10px] font-semibold px-2.5 py-1.5 rounded disabled:opacity-40"
            style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            {sending ? '...' : '➤'}
          </button>
        </div>
      )}
    </div>
  )
}
