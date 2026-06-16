import { notionPost, getDatabaseId } from './client'
import type { Venta } from '@/lib/types'

function parseVentaProps(id: string, p: Record<string, any>): Venta {
  return {
    id,
    nombre: p['Nombre / ID venta']?.title?.[0]?.plain_text ?? '',
    precioVenta: p['Precio de venta (€)']?.number ?? null,
    precioCompra: p['Precio de compra (€)']?.rollup?.number ?? p['Precio de compra (€)']?.formula?.number ?? null,
    margenBruto: p['Margen bruto (€)']?.formula?.number ?? null,
    margenPorcentaje: p['Margen (%)']?.formula?.number ?? null,
    fechaVenta: p['Fecha de venta']?.date?.start ?? null,
    vehiculoId: p['Vehículo']?.relation?.[0]?.id ?? null,
    vendedorId: p['Vendedor']?.relation?.[0]?.id ?? null,
    clienteNombre: p['Cliente nombre']?.rich_text?.[0]?.plain_text ?? '',
    clienteContacto: p['Cliente contacto']?.rich_text?.[0]?.plain_text ?? '',
    formaPago: p['Forma de pago']?.select?.name ?? '',
    financiada: p['Financiada']?.checkbox ?? false,
    financieraId: p['Financiera']?.relation?.[0]?.id ?? null,
    observaciones: p['Observaciones']?.rich_text?.[0]?.plain_text ?? '',
  }
}

export async function getVentas(): Promise<Venta[]> {
  const dbId = getDatabaseId('ventas')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha de venta', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseVentaProps(r.id, r.properties))
}

export async function getVentasByVehicle(vehicleId: string): Promise<Venta[]> {
  const dbId = getDatabaseId('ventas')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    filter: {
      property: 'Vehículo',
      relation: { contains: vehicleId },
    },
  })
  return (data.results || []).map((r: any) => parseVentaProps(r.id, r.properties))
}

export async function createVenta(data: {
  nombre: string
  vehiculoId: string
  fechaVenta: string
  precioVenta?: number | null
  vendedorId?: string | null
  clienteNombre?: string
  clienteContacto?: string
  formaPago?: string
  financiada?: boolean
  financieraId?: string | null
  observaciones?: string
}) {
  const dbId = getDatabaseId('ventas')
  const props: Record<string, any> = {
    'Nombre / ID venta': { title: [{ text: { content: data.nombre } }] },
    'Vehículo': { relation: [{ id: data.vehiculoId }] },
    'Fecha de venta': { date: { start: data.fechaVenta } },
  }
  if (data.precioVenta != null) {
    props['Precio de venta (€)'] = { number: data.precioVenta }
  }
  if (data.vendedorId) {
    props['Vendedor'] = { relation: [{ id: data.vendedorId }] }
  }
  if (data.clienteNombre) {
    props['Cliente nombre'] = { rich_text: [{ text: { content: data.clienteNombre } }] }
  }
  if (data.clienteContacto) {
    props['Cliente contacto'] = { rich_text: [{ text: { content: data.clienteContacto } }] }
  }
  if (data.formaPago) {
    props['Forma de pago'] = { select: { name: data.formaPago } }
  }
  if (data.financiada) {
    props['Financiada'] = { checkbox: true }
  }
  if (data.financieraId) {
    props['Financiera'] = { relation: [{ id: data.financieraId }] }
  }
  if (data.observaciones) {
    props['Observaciones'] = { rich_text: [{ text: { content: data.observaciones } }] }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties: props,
  })
}
