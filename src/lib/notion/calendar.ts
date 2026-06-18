import { notionPost, notionGet, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface CalendarEventItem {
  id: string
  nombre: string
  fechaInicio: string | null
  fechaFin: string | null
  estado: string
  area: string
  responsableId: string | null
  vehicleId: string | null
}

function parseCalendarProps(id: string, p: Record<string, any>): CalendarEventItem {
  return {
    id,
    nombre: p['Nombre del evento']?.title?.[0]?.plain_text ?? '',
    fechaInicio: p['Fecha inicio']?.date?.start ?? null,
    fechaFin: p['Fecha fin']?.date?.start ?? null,
    estado: p['Estado']?.select?.name ?? '',
    area: p['Área']?.select?.name ?? '',
    responsableId: p['Responsable']?.relation?.[0]?.id ?? null,
    vehicleId: p['Vehículo']?.relation?.[0]?.id ?? null,
  }
}

export async function getCalendarEvents(): Promise<CalendarEventItem[]> {
  const dbId = getDatabaseId('calendario_operativo')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseCalendarProps(r.id, r.properties))
}

export async function createCalendarEvent(
  vehicleName: string,
  employeeId: string | null,
  startDate: string
): Promise<void> {
  const dbId = getDatabaseId('calendario_operativo')
  const schema = await getDbSchema('calendario_operativo')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre'
  const dateKey = findPropertyByType(schema, 'date') || 'Fecha'
  const selectProps = findPropertiesByType(schema, 'select')
  const relationProps = findPropertiesByType(schema, 'relation')
  const richTexts = findPropertiesByType(schema, 'rich_text')

  const statusKey = selectProps.find((s) => s.name === 'Estado')?.name || selectProps[2]?.name || 'Estado'
  const relationKey = relationProps[0]?.name || 'Responsable'
  const descKey = richTexts[0]?.name || 'Descripción'

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: `Logística - ${vehicleName}` } }] },
    [dateKey]: { date: { start: startDate } },
    [statusKey]: { select: { name: 'Programado' } },
    [descKey]: { rich_text: [{ text: { content: 'Evento generado automáticamente por UPCARS' } }] },
  }

  if (employeeId) {
    properties[relationKey] = { relation: [{ id: employeeId }] }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
}
