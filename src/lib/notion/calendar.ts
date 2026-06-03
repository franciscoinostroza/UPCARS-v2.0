import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

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
