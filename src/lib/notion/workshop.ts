import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

type OrderType = 'Taller' | 'Chapa' | 'Preparacion' | 'Logistica'
const PREFIXES: Record<OrderType, string> = {
  Taller: 'OT',
  Chapa: 'CHAPA',
  Preparacion: 'PREP',
  Logistica: 'LOG',
}

async function getVehicleName(vehicleId: string): Promise<string> {
  try {
    const schema = await getDbSchema('vehicles')
    const titleKey = findPropertyByType(schema, 'title') || 'Name'

    const res = await fetch(`https://api.notion.com/v1/pages/${vehicleId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (!res.ok) return 'Vehículo'
    const data: any = await res.json()
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

  const relationKey = relations[0]?.name || 'Vehículo'
  const statusKey = selects[0]?.name || 'Estado'
  const responsableKey = relations[1]?.name || 'Responsable'
  const notesKey = richTexts[0]?.name || 'Observaciones'

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: `${prefix} - ${vehicle}` } }] },
    [relationKey]: { relation: [{ id: vehicleId }] },
    [statusKey]: { select: { name: 'Pendiente' } },
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
