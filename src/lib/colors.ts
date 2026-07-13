export const STATE_COLORS: Record<string, { bg: string; text: string }> = {
  // En curso 🔵
  'En proceso': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'En taller': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'En preparación': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'Autorizado': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'Seguimiento': { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },

  // Completado 🟢
  'Terminado': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  'Completado': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  'Listo para stock': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  'Vendido': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },

  // Pendiente 🟡
  'Pendiente': { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  'Pendiente autorización': { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  'Pendiente de Chapa': { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  'Sin empezar': { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },

  // Bloqueado 🔴
  'Bloqueado': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  'Desiste compra': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },

  // Sin estado ⚪
  '': { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' },
}

export const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  'Alta': { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
  'Media': { bg: 'rgba(234,179,8,0.12)', text: '#eab308' },
  'Baja': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
}

export function stateColor(estado: string): { bg: string; text: string } {
  return STATE_COLORS[estado] || STATE_COLORS['']
}

export function priorityColor(prioridad: string): { bg: string; text: string } {
  return PRIORITY_COLORS[prioridad] || { bg: 'rgba(156,163,175,0.12)', text: '#9ca3af' }
}
