import { SituacionComercial, VALID_SITUACION_TRANSITIONS } from '@/lib/types'

export function isValidSituacionTransition(from: SituacionComercial | null, to: SituacionComercial): boolean {
  if (!from) return true
  const allowed = VALID_SITUACION_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

export function isSituacionVendida(situacion: SituacionComercial): boolean {
  return situacion === 'Vendido'
}

export function isSituacionFinal(situacion: SituacionComercial): boolean {
  return situacion === 'Vendido' || situacion === 'Cedido'
}
