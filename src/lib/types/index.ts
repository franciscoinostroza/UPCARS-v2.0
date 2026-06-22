export type SituacionComercial = 'Stock' | 'Exposición' | 'Vendido' | 'Cedido'

export type Ubicacion =
  | 'Sede Central'
  | 'En tránsito'
  | 'Taller Mecánica'
  | 'Taller Chapa'
  | 'Taller Preparación'
  | (string & {})

export interface Vehicle {
  id: string
  name: string
  matricula: string
  brand: string
  model: string
  year: number
  lineaNegocio: string
  tipo: string
  situacion: SituacionComercial
  ubicacion: string
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
  oldSituacion: SituacionComercial | null
  newSituacion: SituacionComercial
  oldUbicacion: string | null
  newUbicacion: string
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
}

export const STUCK_THRESHOLDS: Record<string, number> = {
  'Sede Central': 14,
  'En tránsito': 3,
  'Taller Mecánica': 5,
  'Taller Chapa': 7,
  'Taller Preparación': 2,
}

export const CONCESIONARIO_STUCK_DAYS = 48

export const VALID_SITUACION_TRANSITIONS: Record<SituacionComercial, SituacionComercial[]> = {
  Stock: ['Exposición', 'Vendido', 'Cedido'],
  Exposición: ['Stock', 'Vendido'],
  Vendido: [],
  Cedido: [],
}

export const UBICACIONES_TALLER = ['Taller Mecánica', 'Taller Chapa', 'Taller Preparación'] as const
