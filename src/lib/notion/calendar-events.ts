import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end?: string
  allDay: boolean
  type: 'logistica' | 'rrhh'
}

function tv(p: any, fallback = ''): string {
  return p?.title?.[0]?.plain_text ?? fallback
}

function dateVal(p: any, fallback: string | null = null): string | null {
  return p?.date?.start ?? fallback
}

function sel(p: any, fallback = ''): string {
  return p?.select?.name ?? p?.status?.name ?? fallback
}

export async function getCalendarEvents(dbName: string): Promise<CalendarEvent[]> {
  const dbId = getDatabaseId(dbName)
  const schema = await getDbSchema(dbName)
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre'
  const dateProps = findPropertiesByType(schema, 'date')
  const dateKey = dateProps[0]?.name

  if (!dateKey) return []

  const data: any = await notionPost(`/databases/${dbId}/query`)
  const type: CalendarEvent['type'] = dbName === 'calendario_rrhh' ? 'rrhh' : 'logistica'

  return (data.results || []).map((page: any) => {
    const p = page.properties
    const start = dateVal(p[dateKey])
    if (!start) return null

    return {
      id: page.id,
      title: tv(p[titleKey]),
      start,
      allDay: true,
      type,
    }
  }).filter(Boolean)
}
