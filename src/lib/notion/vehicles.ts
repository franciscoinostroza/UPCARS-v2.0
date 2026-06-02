import { notionPost, notionPatch, getDatabaseId } from './client'
import { parseVehicleProps } from './props'
import { Vehicle } from '@/lib/types'

export async function getVehicles(): Promise<Vehicle[]> {
  const dbId = getDatabaseId('vehicles')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseVehicleProps(r.id, r.properties))
}

export async function getVehicle(pageId: string): Promise<Vehicle | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
      },
    })
    if (!res.ok) return null
    const data: any = await res.json()
    return parseVehicleProps(data.id, data.properties)
  } catch {
    return null
  }
}

export async function updateVehicleStatus(pageId: string, newStatus: string): Promise<void> {
  await notionPatch(`/pages/${pageId}`, {
    properties: {
      'Estado actual': { status: { name: newStatus } },
    },
  })
}
