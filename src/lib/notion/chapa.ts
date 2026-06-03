import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export async function createChapaRecord(
  vehicleId: string,
  vehicleName: string,
  providerId?: string,
  notes?: string
): Promise<void> {
  const dbId = getDatabaseId('chapa')
  const schema = await getDbSchema('chapa')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre / ID'
  const relations = findPropertiesByType(schema, 'relation')
  const selects = findPropertiesByType(schema, 'select')
  const dates = findPropertiesByType(schema, 'date')
  const richTexts = findPropertiesByType(schema, 'rich_text')

  const vehicleRelKey = relations.find((r) => r.name === 'Vehículo')?.name || relations[0]?.name
  const providerRelKey = relations.find((r) => r.name === 'Proveedor externo')?.name || relations[1]?.name
  const statusKey = selects.find((s) => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'
  const fechaSalidaKey = dates.find((d) => d.name === 'Fecha salida')?.name || dates[0]?.name
  const notesKey = richTexts.find((r) => r.name === 'Trabajos solicitados' || r.name === 'Observaciones')?.name || richTexts[0]?.name

  const today = new Date().toISOString().split('T')[0]

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: `CHAPA - ${vehicleName}` } }] },
    [statusKey]: { select: { name: 'En taller externo' } },
    [fechaSalidaKey]: { date: { start: today } },
  }

  if (vehicleRelKey) {
    properties[vehicleRelKey] = { relation: [{ id: vehicleId }] }
  }

  if (providerId && providerRelKey) {
    properties[providerRelKey] = { relation: [{ id: providerId }] }
  }

  if (notes && notesKey) {
    properties[notesKey] = { rich_text: [{ text: { content: notes } }] }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
}
