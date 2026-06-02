import { notionPost, getDatabaseId } from './client'

type OrderType = 'Taller' | 'Chapa' | 'Preparacion' | 'Logistica'
const PREFIXES: Record<OrderType, string> = {
  Taller: 'OT',
  Chapa: 'CHAPA',
  Preparacion: 'PREP',
  Logistica: 'LOG',
}

async function getVehicleName(vehicleId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${vehicleId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (!res.ok) return 'Vehículo'
    const data: any = await res.json()
    return data.properties?.Nombre?.title?.[0]?.plain_text || 'Vehículo'
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
  const prefix = PREFIXES[type]
  const vehicle = await getVehicleName(vehicleId)

  const properties: Record<string, unknown> = {
    'Nombre': { title: [{ text: { content: `${prefix} - ${vehicle}` } }] },
    'Vehículo': { relation: [{ id: vehicleId }] },
    'Estado': { select: { name: 'Pendiente' } },
  }

  if (responsibleId) {
    properties['Responsable'] = { relation: [{ id: responsibleId }] }
  }

  if (notes) {
    properties['Observaciones'] = { rich_text: [{ text: { content: notes } }] }
  }

  await notionPost(`/pages`, {
    parent: { database_id: dbId },
    properties,
  })
}
