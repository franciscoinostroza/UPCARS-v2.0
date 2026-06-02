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
      'Status': { status: { name: newStatus } },
    },
  })
}

export async function assignResponsable(
  pageId: string,
  employeeId: string | null
): Promise<void> {
  await notionPatch(`/pages/${pageId}`, {
    properties: {
      'Responsable': employeeId
        ? { relation: [{ id: employeeId }] }
        : { relation: [] },
    },
  })
}

export async function createVehicle(data: {
  name: string
  matricula?: string
  brand?: string
  model?: string
  year?: number
  lineaNegocio?: string
  tipo?: string
  fechaCompra?: string
  fechaListo?: string
  precioCompra?: number
  precioVenta?: number
}): Promise<string> {
  const dbId = getDatabaseId('vehicles')
  const properties: Record<string, unknown> = {
    'Name': { title: [{ text: { content: data.name } }] },
    'Status': { status: { name: 'Comprado' } },
  }
  if (data.matricula) properties['Matricula'] = { rich_text: [{ text: { content: data.matricula } }] }
  if (data.brand) properties['Brand'] = { rich_text: [{ text: { content: data.brand } }] }
  if (data.model) properties['Model'] = { rich_text: [{ text: { content: data.model } }] }
  if (data.year) properties['Year'] = { number: data.year }
  if (data.lineaNegocio) properties['Linea de negocio'] = { select: { name: data.lineaNegocio } }
  if (data.tipo) properties['Tipo'] = { select: { name: data.tipo } }
  if (data.fechaCompra) properties['Fecha compra'] = { date: { start: data.fechaCompra } }
  if (data.fechaListo) properties['Fecha listo'] = { date: { start: data.fechaListo } }
  if (data.precioCompra !== undefined) properties['Precio compra'] = { number: data.precioCompra }
  if (data.precioVenta !== undefined) properties['Precio venta'] = { number: data.precioVenta }

  const result: any = await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
  return result.id
}
