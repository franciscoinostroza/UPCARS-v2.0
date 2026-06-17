export type VehicleState =
  | 'Comprado'
  | 'Pendiente autorización'
  | 'Autorizado'
  | 'Entregado al concesionario'
  | 'En logística'
  | 'En taller'
  | 'En chapa'
  | 'En preparación'
  | 'Listo para venta'
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
  fechaVendido: string | null
  responsable: string | null
  precioCompra: number | null
  precioVenta: number | null
  combustible: string
  color: string
  kilometrajeEntrada: number | null
  fechaEntradaTaller: string | null
  fechaEntradaPreparacion: string | null
  notas: string
  tiempoTotalDias: number | null
  diasActivoSinCerrar: number | null
  margenBruto: number | null
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

export type WorkshopArea = 'Taller' | 'Chapa' | 'Preparacion' | 'Logistica'

export interface WorkshopOrder {
  id: string
  vehicleId: string
  type: WorkshopArea
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
  email: string
  role: string
  department: string
  active: boolean
}

export interface Venta {
  id: string
  nombre: string
  precioVenta: number | null
  precioCompra: number | null
  margenBruto: number | null
  margenPorcentaje: number | null
  fechaVenta: string | null
  vehiculoId: string | null
  vendedorId: string | null
  clienteNombre: string
  clienteContacto: string
  formaPago: string
  financiada: boolean
  financieraId: string | null
  observaciones: string
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

function envHours(key: string, fallback: number): number {
  const val = typeof process !== 'undefined' ? process.env[key] : undefined
  return val ? parseInt(val, 10) || fallback : fallback
}

export const SLA_THRESHOLDS: Record<string, number> = {
  Taller: envHours('SLA_TALLER', 72),
  Chapa: envHours('SLA_CHAPA', 120),
  Preparacion: envHours('SLA_PREPARACION', 24),
  Logistica: envHours('SLA_LOGISTICA', 24),
}

export const STUCK_THRESHOLDS: Partial<Record<VehicleState, number>> = {
  Comprado: 7,
  'Pendiente autorización': 7,
  'Autorizado': 7,
  'Entregado al concesionario': 7,
  'En logística': 3,
  'En taller': 5,
  'En chapa': 7,
  'En preparación': 2,
  'Listo para venta': 14,
  Cedido: 30,
}

export const VALID_TRANSITIONS: Record<VehicleState, VehicleState[]> = {
  Comprado: ['Pendiente autorización', 'En logística'],
  'Pendiente autorización': ['Autorizado'],
  'Autorizado': ['Entregado al concesionario'],
  'Entregado al concesionario': ['En preparación'],
  'En logística': ['En taller', 'En chapa', 'Cedido'],
  'En taller': ['En chapa', 'En preparación'],
  'En chapa': ['En taller', 'En preparación'],
  'En preparación': ['Listo para venta'],
  'Listo para venta': ['Vendido', 'Cedido'],
  Vendido: [],
  Cedido: ['En logística', 'En taller'],
}
