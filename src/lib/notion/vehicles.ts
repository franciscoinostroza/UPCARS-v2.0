import { notionPost, notionPatch, getDatabaseId } from './client'
import { parseVehicleProps } from './props'
import { Vehicle } from '@/lib/types'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

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
  const schema = await getDbSchema('vehicles')
  const statusKey = findPropertyByType(schema, 'status') || 'Status'

  await notionPatch(`/pages/${pageId}`, {
    properties: {
      [statusKey]: { status: { name: newStatus } },
    },
  })
}

export async function assignResponsable(
  pageId: string,
  employeeId: string | null
): Promise<void> {
  const schema = await getDbSchema('vehicles')
  const relations = findPropertiesByType(schema, 'relation')
  const responsableKey = relations[0]?.name

  if (!responsableKey) {
    throw new Error('No relation property found in vehicles database')
  }

  await notionPatch(`/pages/${pageId}`, {
    properties: {
      [responsableKey]: employeeId
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
  const schema = await getDbSchema('vehicles')

  const titleKey = findPropertyByType(schema, 'title') || 'Name'
  const statusKey = findPropertyByType(schema, 'status') || 'Status'
  const richTexts = findPropertiesByType(schema, 'rich_text')
  const selects = findPropertiesByType(schema, 'select')
  const dates = findPropertiesByType(schema, 'date')
  const numbers = findPropertiesByType(schema, 'number')

  const richTextNames = ['Matrícula', 'Matricula', 'Marca', 'Brand', 'Modelo', 'Model']

  function getRichTextKey(candidates: string[], fallbackIdx: number): string | undefined {
    for (const c of candidates) {
      const found = richTexts.find((r) => r.name === c)
      if (found) return found.name
    }
    return richTexts[fallbackIdx]?.name
  }

  function getSelectKey(candidates: string[], fallbackIdx: number): string | undefined {
    for (const c of candidates) {
      const found = selects.find((s) => s.name === c)
      if (found) return found.name
    }
    return selects[fallbackIdx]?.name
  }

  function getDateKey(candidates: string[], fallbackIdx: number): string | undefined {
    for (const c of candidates) {
      const found = dates.find((d) => d.name === c)
      if (found) return found.name
    }
    return dates[fallbackIdx]?.name
  }

  function getNumberKey(candidates: string[], fallbackIdx: number): string | undefined {
    for (const c of candidates) {
      const found = numbers.find((n) => n.name === c)
      if (found) return found.name
    }
    return numbers[fallbackIdx]?.name
  }

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: data.name } }] },
    [statusKey]: { status: { name: 'Comprado' } },
  }

  if (data.matricula) {
    const k = getRichTextKey(['Matrícula', 'Matricula'], 0)
    if (k) properties[k] = { rich_text: [{ text: { content: data.matricula } }] }
  }
  if (data.brand) {
    const k = getRichTextKey(['Marca', 'Brand'], richTextNames.indexOf('Brand') >= 0 ? 1 : 0)
    if (k) properties[k] = { rich_text: [{ text: { content: data.brand } }] }
  }
  if (data.model) {
    const k = getRichTextKey(['Modelo', 'Model'], 2)
    if (k) properties[k] = { rich_text: [{ text: { content: data.model } }] }
  }
  if (data.year) {
    const k = getNumberKey(['Año', 'Year', 'Ano'], 0)
    if (k) properties[k] = { number: data.year }
  }
  if (data.lineaNegocio) {
    const k = getSelectKey(['Línea de negocio', 'Linea de negocio', 'Linea de negocio'], 0)
    if (k) properties[k] = { select: { name: data.lineaNegocio } }
  }
  if (data.tipo) {
    const k = getSelectKey(['Tipo de vehículo', 'Tipo', 'Tipo de vehiculo'], 1)
    if (k) properties[k] = { select: { name: data.tipo } }
  }
  if (data.fechaCompra) {
    const k = getDateKey(['Fecha de compra', 'Fecha compra'], 0)
    if (k) properties[k] = { date: { start: data.fechaCompra } }
  }
  if (data.fechaListo) {
    const k = getDateKey(['Fecha listo para venta', 'Fecha listo'], 1)
    if (k) properties[k] = { date: { start: data.fechaListo } }
  }
  if (data.precioCompra !== undefined) {
    const k = getNumberKey(['Precio de compra (€)', 'Precio compra', 'Precio de compra'], 1)
    if (k) properties[k] = { number: data.precioCompra }
  }
  if (data.precioVenta !== undefined) {
    const k = getNumberKey(['Precio de venta (€)', 'Precio venta', 'Precio de venta'], 2)
    if (k) properties[k] = { number: data.precioVenta }
  }

  const result: any = await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
  return result.id
}
