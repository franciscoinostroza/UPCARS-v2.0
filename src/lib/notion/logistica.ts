import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface LogisticaRecord {
  id: string
  nombre: string
  vehiculoId: string | null
  responsableId: string | null
  estado: string
  fechaProgramada: string | null
  fechaRealizada: string | null
  ubicacion: string
  situacionComercial: string
  prioridad: string
  observaciones: string
  authFileName: string | null
  authFileUrl: string | null
}

function parseLogisticaProps(id: string, p: Record<string, any>): LogisticaRecord {
  const file = p['Autorización de retirada ']?.files?.[0]
  return {
    id,
    nombre: p['Nombre / ID']?.title?.[0]?.plain_text ?? '',
    vehiculoId: p['Vehículo']?.relation?.[0]?.id ?? null,
    responsableId: p['Responsable']?.relation?.[0]?.id ?? null,
    estado: p['Estado']?.select?.name ?? '',
    fechaProgramada: p['Fecha programada']?.date?.start ?? null,
    fechaRealizada: p['Fecha realizada']?.date?.start ?? null,
    ubicacion: p['UBICACION']?.rich_text?.[0]?.plain_text ?? '',
    situacionComercial: p['Situación comercial']?.select?.name ?? '',
    prioridad: p['Prioridad']?.select?.name ?? '',
    observaciones: p['Observaciones']?.rich_text?.[0]?.plain_text ?? '',
    authFileName: file?.name ?? null,
    authFileUrl: file?.file?.url ?? file?.external?.url ?? null,
  }
}

export async function getLogisticaRecords(): Promise<LogisticaRecord[]> {
  const dbId = getDatabaseId('logistics')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha programada', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseLogisticaProps(r.id, r.properties))
}

export async function createLogisticaRecord(data: {
  nombre: string
  vehiculoId?: string
  responsableId?: string
  estado?: string
  fechaProgramada?: string
  ubicacion?: string
  situacionComercial?: string
  prioridad?: string
  observaciones?: string
}) {
  const dbId = getDatabaseId('logistics')
  const schema = await getDbSchema('logistics')
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre / ID'
  const selects = findPropertiesByType(schema, 'select') || []
  const relations = findPropertiesByType(schema, 'relation') || []

  const findSelect = (candidates: string[], fallback: number) =>
    selects.find(s => candidates.includes(s.name))?.name || selects[fallback]?.name || candidates[0]
  const findRelation = (candidates: string[], fallback: number) =>
    relations.find(r => candidates.includes(r.name))?.name || relations[fallback]?.name

  const props: Record<string, any> = {
    [titleKey]: { title: [{ text: { content: data.nombre } }] },
    [findSelect(['Estado'], 0)]: { select: { name: data.estado || 'Pendiente autorización' } },
  }
  if (data.responsableId && findRelation(['Responsable'], 0)) {
    props[findRelation(['Responsable'], 0)!] = { relation: [{ id: data.responsableId }] }
  }
  if (data.vehiculoId && findRelation(['Vehículo'], 1)) {
    props[findRelation(['Vehículo'], 1)!] = { relation: [{ id: data.vehiculoId }] }
  }
  if (data.fechaProgramada) props['Fecha programada'] = { date: { start: data.fechaProgramada } }
  if (data.ubicacion) props['UBICACION'] = { rich_text: [{ text: { content: data.ubicacion } }] }
  if (data.situacionComercial) props['Situación comercial'] = { select: { name: data.situacionComercial } }
  if (data.prioridad) props['Prioridad'] = { select: { name: data.prioridad } }
  if (data.observaciones) props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }

  await notionPost('/pages', { parent: { database_id: dbId }, properties: props })
}

export async function updateLogisticaRecord(id: string, data: Record<string, any>) {
  const schema = await getDbSchema('logistics')
  const selects = findPropertiesByType(schema, 'select') || []
  const relations = findPropertiesByType(schema, 'relation') || []
  const dates = findPropertiesByType(schema, 'date') || []

  const findSelect = (candidates: string[], fallback: number) =>
    selects.find(s => candidates.includes(s.name))?.name || selects[fallback]?.name

  const props: Record<string, any> = {}
  if (data.estado) props['Estado'] = { select: { name: data.estado } }
  if (data.ubicacion !== undefined) props['UBICACION'] = { rich_text: [{ text: { content: data.ubicacion } }] }
  if (data.situacionComercial) props['Situación comercial'] = { select: { name: data.situacionComercial } }
  if (data.prioridad) props['Prioridad'] = { select: { name: data.prioridad } }
  if (data.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }
  if (data.responsableId) {
    const relKey = relations.find(r => r.name === 'Responsable')?.name || relations[0]?.name
    if (relKey) props[relKey] = { relation: [{ id: data.responsableId }] }
  }
  if (data.vehiculoId) {
    const relKey = relations.find(r => r.name === 'Vehículo')?.name || relations[1]?.name
    if (relKey) props[relKey] = { relation: [{ id: data.vehiculoId }] }
  }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
