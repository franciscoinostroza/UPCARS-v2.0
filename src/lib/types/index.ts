export type VehicleState =
  | 'Comprado'
  | 'Logistica'
  | 'Taller'
  | 'Chapa'
  | 'Preparacion'
  | 'Listo'
  | 'Vendido'
  | 'Cedido'

export interface Vehicle {
  id: string
  name: string
  matricula: string
  brand: string
  model: string
  year: number
  lineaNegocio: string
  tipo: string
  state: VehicleState
  fechaCompra: string
  fechaListo: string | null
  responsable: string | null
  precioCompra: number | null
  precioVenta: number | null
  costeTotal: number | null
}

export interface NotionVehiclePage {
  id: string
  properties: Record<string, unknown>
}

export interface StateChangeEvent {
  vehicleId: string
  vehicleName: string
  oldState: VehicleState | null
  newState: VehicleState
  timestamp: Date
}

export interface WorkshopOrder {
  id: string
  vehicleId: string
  type: 'Taller' | 'Chapa' | 'Preparacion' | 'Logistica'
  state: string
  responsibleId: string | null
  startDate: string | null
  endDate: string | null
}

export interface Task {
  id: string
  name: string
  vehicleId: string | null
  responsibleIds: string[]
  priority: 'Alta' | 'Media' | 'Baja'
  state: 'Sin empezar' | 'En progreso' | 'Bloqueada' | 'Completada' | 'Cancelada'
  deadline: string | null
}

export interface Employee {
  id: string
  name: string
  role: string
  department: string
  active: boolean
}

export interface GoogleReview {
  id: string
  authorName: string
  rating: number
  comment: string | null
  publishDate: string
  reviewUrl: string | null
}

export interface SLARecord {
  id: string
  vehicleId: string
  area: string
  startTime: Date
  endTime: Date | null
  threshold: number
  met: boolean | null
}

export interface AlertRecord {
  id: string
  vehicleId: string
  vehicleName: string
  type: string
  message: string
  resolved: boolean
  createdAt: Date
  resolvedAt: Date | null
}

export const SLA_THRESHOLDS: Record<string, number> = {
  Taller: 72,
  Chapa: 120,
  Preparacion: 24,
  Logistica: 24,
}

export const VALID_TRANSITIONS: Record<VehicleState, VehicleState[]> = {
  Comprado: ['Logistica'],
  Logistica: ['Taller', 'Chapa', 'Cedido'],
  Taller: ['Chapa', 'Preparacion'],
  Chapa: ['Taller', 'Preparacion'],
  Preparacion: ['Listo'],
  Listo: ['Vendido', 'Cedido'],
  Vendido: [],
  Cedido: ['Logistica', 'Taller'],
}
