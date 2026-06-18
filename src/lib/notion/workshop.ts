import { notionPost, notionGet, getDatabaseId } from './client'

export interface WorkshopOrderItem {
  id: string
  nombre: string
  vehicleId: string | null
  responsableId: string | null
  tipo: string
  estado: string
  fechaEntrada: string | null
  fechaSalida: string | null
  observaciones: string
}

function parseWorkshopProps(id: string, p: Record<string, any>): WorkshopOrderItem {
  const allKeys = Object.keys(p)
  const dateKeys = allKeys.filter(k => p[k]?.type === 'date')
  const entradaKey = dateKeys.find(k => k.includes('entrada')) || dateKeys[0]
  const salidaKey = dateKeys.find(k => k.includes('salida')) || dateKeys[1]

  return {
    id,
    nombre: p['Nombre /ID orden']?.title?.[0]?.plain_text ?? '',
    vehicleId: p['Vehículo']?.relation?.[0]?.id ?? null,
    responsableId: p['Mecánico asignado']?.relation?.[0]?.id ?? p['Responsable']?.relation?.[0]?.id ?? null,
    tipo: p['Tipo de trabajo']?.select?.name ?? '',
    estado: p['Estado']?.select?.name ?? '',
    fechaEntrada: entradaKey ? (p[entradaKey]?.date?.start ?? null) : null,
    fechaSalida: salidaKey ? (p[salidaKey]?.date?.start ?? null) : null,
    observaciones: p['Observaciones']?.rich_text?.[0]?.plain_text ?? '',
  }
}

export async function getWorkshopOrders(): Promise<WorkshopOrderItem[]> {
  const dbId = getDatabaseId('workshop')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseWorkshopProps(r.id, r.properties))
}

type OrderType = 'Taller' | 'Chapa' | 'Preparacion' | 'Logistica'
const PREFIXES: Record<OrderType, string> = {
  Taller: 'OT',
  Chapa: 'CHAPA',
  Preparacion: 'PREP',
  Logistica: 'LOG',
}

async function getVehicleName(vehicleId: string): Promise<string> {
  try {
    const data: any = await notionGet(`/pages/${vehicleId}`)
    const titleKey = Object.keys(data.properties).find(k => data.properties[k]?.type === 'title') || ''
    return data.properties?.[titleKey]?.title?.[0]?.plain_text || 'Vehículo'
  } catch {
    return 'Vehículo'
  }
}

export async function createWorkshopOrder(
  type: OrderType,
  vehicleId: string,
  responsibleId: string | null,
  notes?: string
) {
  const dbId = getDatabaseId('workshop')
  const schema = await getDbSchema('workshop')
  const prefix = PREFIXES[type]
  const vehicle = await getVehicleName(vehicleId)

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre'
  const relations = findPropertiesByType(schema, 'relation')
  const selects = findPropertiesByType(schema, 'select')
  const richTexts = findPropertiesByType(schema, 'rich_text')

  const relationKey = relations.find((r) => r.name === 'Vehículo')?.name || relations[0]?.name || 'Vehículo'
  const statusKey = selects.find((s) => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'
  const responsableKey = relations.find((r) => r.name === 'Mecánico asignado' || r.name === 'Responsable')?.name || relations[1]?.name || 'Responsable'
  const notesKey = richTexts.find((r) => r.name === 'Observaciones')?.name || richTexts[0]?.name || 'Observaciones'

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: `${prefix} - ${vehicle}` } }] },
    [relationKey]: { relation: [{ id: vehicleId }] },
    [statusKey]: { select: { name: 'En proceso' } },
  }

  if (responsibleId) {
    properties[responsableKey] = { relation: [{ id: responsibleId }] }
  }

  if (notes) {
    properties[notesKey] = { rich_text: [{ text: { content: notes } }] }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
}
