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
    observaciones: p['Observaciones']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
  }
}

export async function getPrepRecords(): Promise<PrepRecord[]> {
  const dbId = getDatabaseId('preparacion')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parsePrepProps(r.id, r.properties))
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
  if (data.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
