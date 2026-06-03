import { VehicleState, VALID_TRANSITIONS } from '@/lib/types'

export function isValidTransition(from: VehicleState | null, to: VehicleState): boolean {
  if (!from) return true
  const allowed = VALID_TRANSITIONS[from]
  return allowed.includes(to)
}

export function getNextExpectedState(current: VehicleState): VehicleState | null {
  const flow: VehicleState[] = ['Comprado', 'En logística', 'En taller', 'En chapa', 'En preparación', 'Listo para venta', 'Vendido', 'Cedido']
  const idx = flow.indexOf(current)
  if (idx === -1 || idx === flow.length - 1) return null
  return flow[idx + 1]
}

export function isTerminalState(state: VehicleState): boolean {
  return state === 'Vendido'
}
