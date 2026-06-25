import { NextRequest, NextResponse } from 'next/server'
import { notionGet, notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const AREA_DATA: Record<string, { label: string; dateFields: string[] }> = {
  logistica: { label: 'Logística', dateFields: [] },
  taller: { label: 'Taller', dateFields: ['Fecha entrada taller'] },
  chapa: { label: 'Chapa y Pintura', dateFields: [] },
  preparacion: { label: 'Preparación', dateFields: ['Fecha inicio'] },
  ventas: { label: 'Ventas', dateFields: ['Fecha de venta'] },
}

function extractRelation(props: any, key: string): string | null {
  return props[key]?.relation?.[0]?.id ?? null
}

function extractDate(props: any, key: string): string | null {
  return props[key]?.date?.start ?? null
}

function extractNumber(props: any, key: string): number | null {
  return props[key]?.number ?? null
}

function extractText(props: any, key: string): string {
  return props[key]?.rich_text?.[0]?.plain_text ?? ''
}

function extractSelect(props: any, key: string): string {
  return props[key]?.select?.name ?? ''
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ area: string }> }
) {
  try {
    const { area } = await params
    const config = AREA_DATA[area]
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown area: ${area}` }, { status: 400 })
    }

    const props = await request.json()

    // Extract vehicleId from the Vehículo relation
    const vehicleId = extractRelation(props, 'Vehículo')
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'No vehicle found in the record' }, { status: 400 })
    }

    // Build the update payload for the vehicle
    const updateProps: Record<string, any> = {}

    // Date fields
    for (const dateField of config.dateFields) {
      const dateVal = extractDate(props, dateField)
      if (dateVal) {
        if (dateField === 'Fecha entrada taller') {
          updateProps['Fecha entrada taller'] = { date: { start: dateVal } }
        } else if (dateField === 'Fecha inicio') {
          updateProps['Fecha entrada preparación'] = { date: { start: dateVal } }
        } else if (dateField === 'Fecha de venta') {
          updateProps['Fecha de venta'] = { date: { start: dateVal } }
        }
      }
    }

    // Responsable / Mecánico asignado / Preparador / Vendedor
    const responsableKeys: Record<string, string> = {
      logistica: 'Responsable',
      taller: 'Mecánico asignado',
      preparacion: 'Preparador',
      ventas: 'Vendedor',
    }
    if (responsableKeys[area]) {
      const respId = extractRelation(props, responsableKeys[area])
      if (respId) {
        updateProps['Responsable Actual'] = { relation: [{ id: respId }] }
      }
    }

    // Ubicación (only for logística)
    if (area === 'logistica') {
      const ubicacion = extractText(props, 'UBICACION')
      if (ubicacion) {
        updateProps['Ubicación'] = { select: { name: ubicacion } }
      }
    }

    // Precio de venta (only for ventas)
    if (area === 'ventas') {
      const precio = extractNumber(props, 'Precio de venta (€)')
      if (precio != null) {
        updateProps['Precio venta (€)'] = { number: precio }
      }
    }

    // Append observaciones to Notas
    const observaciones = extractText(props, 'Observaciones')
    if (observaciones) {
      // Read current vehicle Notas
      let existingNotas = ''
      try {
        const vehicle: any = await notionGet(`/pages/${vehicleId}`)
        existingNotas = vehicle.properties?.Notas?.rich_text?.[0]?.plain_text ?? ''
      } catch {}

      const newEntry = `\n--- ${config.label} ---\n${observaciones}`
      updateProps['Notas'] = { rich_text: [{ text: { content: existingNotas + newEntry } }] }
    }

    if (Object.keys(updateProps).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${vehicleId}`, { properties: updateProps })

    return NextResponse.json({ success: true, area, updated: Object.keys(updateProps) })
  } catch (error: any) {
    console.error('Sync from-area error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Sync failed' }, { status: 500 })
  }
}
