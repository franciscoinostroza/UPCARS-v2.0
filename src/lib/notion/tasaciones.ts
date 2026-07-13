import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface TasacionItem {
  id: string
  nombre: string
  estado: string
  prioridad: string
  descripcion: string
  tipoTarea: string[]
  area: string[]
  plazo: string | null
  responsableId: string | null
  responsableNombre: string | null
  archivos: { name: string; url: string }[]
}

function parseTasacionProps(id: string, p: Record<string, any>): TasacionItem {
  return {
    id,
    nombre: p['Nombre de tarea']?.title?.[0]?.plain_text ?? '',
    estado: p['Estado']?.select?.name ?? '',
    prioridad: p['Prioridad']?.select?.name ?? '',
    descripcion: p['Descripción']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    tipoTarea: p['Tipo de tarea']?.multi_select?.map((o: any) => o.name) ?? [],
    area: p['Area']?.multi_select?.map((o: any) => o.name) ?? [],
    plazo: p['Plazo']?.date?.start ?? null,
    responsableId: p['Responsable']?.relation?.[0]?.id ?? null,
    responsableNombre: null,
    archivos: (p['Adjuntar archivo']?.files ?? []).map((f: any) => ({
      name: f.name,
      url: f.file?.url ?? f.external?.url ?? '',
    })),
  }
}

export async function getTasaciones(): Promise<TasacionItem[]> {
  const dbId = getDatabaseId('tasaciones')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseTasacionProps(r.id, r.properties))
}

export async function createTasacion(data: {
  nombre: string
  estado?: string
  prioridad?: string
  descripcion?: string
  tipoTarea?: string[]
  area?: string[]
  plazo?: string
  responsableId?: string
}) {
  const dbId = getDatabaseId('tasaciones')
  const schema = await getDbSchema('tasaciones')
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre de tarea'
  const selects = findPropertiesByType(schema, 'select') || []
  const multiSelects = findPropertiesByType(schema, 'multi_select') || []
  const richTexts = findPropertiesByType(schema, 'rich_text') || []
  const dates = findPropertiesByType(schema, 'date') || []
  const relations = findPropertiesByType(schema, 'relation') || []

  const props: Record<string, any> = {
    [titleKey]: { title: [{ text: { content: data.nombre } }] },
  }
  if (data.estado) {
    const k = selects.find(s => s.name === 'Estado')?.name || selects[0]?.name
    if (k) props[k] = { select: { name: data.estado } }
  }
  if (data.prioridad) {
    const k = selects.find(s => s.name === 'Prioridad')?.name || selects[1]?.name
    if (k) props[k] = { select: { name: data.prioridad } }
  }
  if (data.descripcion && richTexts[0]) {
    props[richTexts[0].name] = { rich_text: [{ text: { content: data.descripcion } }] }
  }
  if (data.tipoTarea?.length && multiSelects[0]) {
    props[multiSelects[0].name] = { multi_select: data.tipoTarea.map((n: string) => ({ name: n })) }
  }
  if (data.area?.length && multiSelects[1]) {
    props[multiSelects[1].name] = { multi_select: data.area.map((n: string) => ({ name: n })) }
  }
  if (data.plazo && dates[0]) {
    props[dates[0].name] = { date: { start: data.plazo } }
  }
  if (data.responsableId && relations[0]) {
    props[relations[0].name] = { relation: [{ id: data.responsableId }] }
  }

  await notionPost('/pages', { parent: { database_id: dbId }, properties })
}

export async function updateTasacion(id: string, data: Record<string, any>) {
  const props: Record<string, any> = {}
  if (data.estado !== undefined) props['Estado'] = { select: { name: data.estado } }
  if (data.prioridad !== undefined) props['Prioridad'] = { select: { name: data.prioridad } }
  if (data.descripcion !== undefined) props['Descripción'] = { rich_text: [{ text: { content: data.descripcion } }] }
  if (data.plazo !== undefined) props['Plazo'] = { date: { start: data.plazo } }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
