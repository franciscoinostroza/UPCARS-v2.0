import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface ChapaRecord {
  id: string
  matricula: string
  vehiculoId: string | null
  vehiculoNombre: string | null
  estado: string
  proveedorId: string | null
  costeTotal: number | null
  fechaSalida: string | null
  fechaRetorno: string | null
  trabajosSolicitados: string
  observaciones: string
  diasFuera: number | null
}

function parseChapaProps(id: string, p: Record<string, any>): ChapaRecord {
  return {
    id,
    matricula: p['Matricula']?.title?.[0]?.plain_text ?? '',
    vehiculoId: p['Vehículo']?.relation?.[0]?.id ?? null,
    vehiculoNombre: null,
    estado: p['Estado']?.select?.name ?? '',
    proveedorId: p['Proveedor externo']?.relation?.[0]?.id ?? null,
    costeTotal: p['Coste total (€)']?.number ?? null,
    fechaSalida: p['Fecha salida']?.date?.start ?? null,
    fechaRetorno: p['Fecha retorno']?.date?.start ?? null,
    trabajosSolicitados: p['Trabajos solicitados']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    observaciones: p['Observaciones']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    diasFuera: p['Días fuera']?.formula?.number ?? null,
  }
}

export async function getChapaRecords(): Promise<ChapaRecord[]> {
  const dbId = getDatabaseId('chapa')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha salida', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseChapaProps(r.id, r.properties))
}

export async function createChapaRecord(data: {
  matricula: string
  vehiculoId: string
  estado?: string
  proveedorId?: string
  costeTotal?: number
  fechaSalida?: string
  fechaRetorno?: string
  trabajosSolicitados?: string
  observaciones?: string
}) {
  const dbId = getDatabaseId('chapa')
  const schema = await getDbSchema('chapa')
  const titleKey = findPropertyByType(schema, 'title') || 'Matricula'
  const selects = findPropertiesByType(schema, 'select') || []
  const relations = findPropertiesByType(schema, 'relation') || []
  const dates = findPropertiesByType(schema, 'date') || []
  const numbers = findPropertiesByType(schema, 'number') || []
  const richTexts = findPropertiesByType(schema, 'rich_text') || []

  const vehKey = relations.find(r => r.name === 'Vehículo')?.name || relations[0]?.name
  const provKey = relations.find(r => r.name === 'Proveedor externo')?.name || relations[1]?.name
  const estadoKey = selects.find(s => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'
  const costeKey = numbers.find(n => n.name.includes('Coste'))?.name || numbers[0]?.name
  const fechaSalidaKey = dates.find(d => d.name.includes('salida'))?.name || dates[0]?.name
  const fechaRetornoKey = dates.find(d => d.name.includes('retorno'))?.name || dates[1]?.name
  const trabajosKey = richTexts.find(r => r.name.includes('Trabajos'))?.name || richTexts[0]?.name
  const obsKey = richTexts.find(r => r.name === 'Observaciones')?.name || richTexts[1]?.name

  const properties: Record<string, any> = {
    [titleKey]: { title: [{ text: { content: data.matricula } }] },
    [estadoKey]: { select: { name: data.estado || 'Pendiente de Chapa' } },
  }
  if (data.vehiculoId && vehKey) properties[vehKey] = { relation: [{ id: data.vehiculoId }] }
  if (data.proveedorId && provKey) properties[provKey] = { relation: [{ id: data.proveedorId }] }
  if (data.costeTotal != null && costeKey) properties[costeKey] = { number: data.costeTotal }
  if (data.fechaSalida && fechaSalidaKey) properties[fechaSalidaKey] = { date: { start: data.fechaSalida } }
  if (data.fechaRetorno && fechaRetornoKey) properties[fechaRetornoKey] = { date: { start: data.fechaRetorno } }
  if (data.trabajosSolicitados && trabajosKey) properties[trabajosKey] = { rich_text: [{ text: { content: data.trabajosSolicitados } }] }
  if (data.observaciones && obsKey) properties[obsKey] = { rich_text: [{ text: { content: data.observaciones } }] }

  await notionPost('/pages', { parent: { database_id: dbId }, properties })
}

export async function updateChapaRecord(id: string, data: Record<string, any>) {
  const props: Record<string, any> = {}
  if (data.estado) props['Estado'] = { select: { name: data.estado } }
  if (data.costeTotal !== undefined) props['Coste total (€)'] = { number: data.costeTotal }
  if (data.fechaSalida !== undefined) props['Fecha salida'] = { date: { start: data.fechaSalida } }
  if (data.fechaRetorno !== undefined) props['Fecha retorno'] = { date: { start: data.fechaRetorno } }
  if (data.trabajosSolicitados !== undefined) props['Trabajos solicitados'] = { rich_text: [{ text: { content: data.trabajosSolicitados } }] }
  if (data.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }
  if (data.proveedorId) props['Proveedor externo'] = { relation: [{ id: data.proveedorId }] }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
