import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface PrepRecord {
  id: string
  nombre: string
  vehiculoId: string | null
  vehiculoNombre: string | null
  estado: string
  preparadorId: string | null
  tipoLimpieza: string
  fechaInicio: string | null
  fechaFin: string | null
  fechaEntrega: string | null
  horasInvertidas: number | null
  limpiezaInterior: boolean
  limpiezaExterior: boolean
  fotografiaAnuncio: boolean
  registrarInicio: boolean
  registrarFin: boolean
  observaciones: string
}

function parsePrepProps(id: string, p: Record<string, any>): PrepRecord {
  return {
    id,
    nombre: p['Nombre / ID']?.title?.[0]?.plain_text ?? '',
    vehiculoId: p['Vehículo']?.relation?.[0]?.id ?? null,
    vehiculoNombre: null,
    estado: p['Estado']?.select?.name ?? '',
    preparadorId: p['Preparador']?.relation?.[0]?.id ?? null,
    tipoLimpieza: p['Tipo de limpieza']?.select?.name ?? '',
    fechaInicio: p['Fecha inicio']?.date?.start ?? null,
    fechaFin: p['Fecha fin']?.date?.start ?? null,
    fechaEntrega: p['fecha de entrega']?.date?.start ?? null,
    horasInvertidas: p['Horas invertidas']?.formula?.number ?? null,
    limpiezaInterior: p['Limpieza interior']?.checkbox ?? false,
    limpiezaExterior: p['Limpieza exterior']?.checkbox ?? false,
    fotografiaAnuncio: p['Fotografía para anuncio']?.checkbox ?? false,
    registrarInicio: p['Registrar inicio']?.checkbox ?? false,
    registrarFin: p['registrar fin']?.checkbox ?? false,
    observaciones: p['Observaciones']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
  }
}

export async function getPrepRecords(): Promise<PrepRecord[]> {
  const dbId = getDatabaseId('preparacion')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parsePrepProps(r.id, r.properties))
}

export async function createPrepRecord(data: {
  nombre: string
  vehiculoId?: string
  estado?: string
  preparadorId?: string
  tipoLimpieza?: string
  fechaInicio?: string
  fechaFin?: string
  fechaEntrega?: string
  observaciones?: string
}) {
  const dbId = getDatabaseId('preparacion')
  const schema = await getDbSchema('preparacion')
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre / ID'
  const selects = findPropertiesByType(schema, 'select') || []
  const relations = findPropertiesByType(schema, 'relation') || []
  const dates = findPropertiesByType(schema, 'date') || []
  const richTexts = findPropertiesByType(schema, 'rich_text') || []

  const vehKey = relations.find(r => r.name === 'Vehículo')?.name || relations[0]?.name
  const prepKey = relations.find(r => r.name === 'Preparador')?.name || relations[1]?.name
  const estadoKey = selects.find(s => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'
  const tipoKey = selects.find(s => s.name === 'Tipo de limpieza')?.name || selects[1]?.name
  const obsKey = richTexts.find(r => r.name === 'Observaciones')?.name || richTexts[0]?.name
  const inicioKey = dates.find(d => d.name === 'Fecha inicio')?.name || dates[0]?.name
  const finKey = dates.find(d => d.name === 'Fecha fin')?.name || dates[1]?.name
  const entregaKey = dates.find(d => d.name.includes('entrega'))?.name || dates[2]?.name

  const properties: Record<string, any> = {
    [titleKey]: { title: [{ text: { content: data.nombre } }] },
    [estadoKey]: { select: { name: data.estado || 'Pendiente' } },
  }
  if (data.vehiculoId && vehKey) properties[vehKey] = { relation: [{ id: data.vehiculoId }] }
  if (data.preparadorId && prepKey) properties[prepKey] = { relation: [{ id: data.preparadorId }] }
  if (data.tipoLimpieza && tipoKey) properties[tipoKey] = { select: { name: data.tipoLimpieza } }
  if (data.fechaInicio && inicioKey) properties[inicioKey] = { date: { start: data.fechaInicio } }
  if (data.fechaFin && finKey) properties[finKey] = { date: { start: data.fechaFin } }
  if (data.fechaEntrega && entregaKey) properties[entregaKey] = { date: { start: data.fechaEntrega } }
  if (data.observaciones && obsKey) properties[obsKey] = { rich_text: [{ text: { content: data.observaciones } }] }

  await notionPost('/pages', { parent: { database_id: dbId }, properties })
}

export async function updatePrepRecord(id: string, data: Record<string, any>) {
  const props: Record<string, any> = {}
  if (data.estado) props['Estado'] = { select: { name: data.estado } }
  if (data.tipoLimpieza) props['Tipo de limpieza'] = { select: { name: data.tipoLimpieza } }
  if (data.fechaInicio !== undefined) props['Fecha inicio'] = { date: { start: data.fechaInicio } }
  if (data.fechaFin !== undefined) props['Fecha fin'] = { date: { start: data.fechaFin } }
  if (data.fechaEntrega !== undefined) props['fecha de entrega'] = { date: { start: data.fechaEntrega } }
  if (data.limpiezaInterior !== undefined) props['Limpieza interior'] = { checkbox: data.limpiezaInterior }
  if (data.limpiezaExterior !== undefined) props['Limpieza exterior'] = { checkbox: data.limpiezaExterior }
  if (data.fotografiaAnuncio !== undefined) props['Fotografía para anuncio'] = { checkbox: data.fotografiaAnuncio }
  if (data.registrarInicio !== undefined) props['Registrar inicio'] = { checkbox: data.registrarInicio }
  if (data.registrarFin !== undefined) props['registrar fin'] = { checkbox: data.registrarFin }
  if (data.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
