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

async function getProperties(request: NextRequest, area: string): Promise<{ props: any; recordId: string | null }> {
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('recordId')

  if (recordId) {
    // GET mode: read the page directly from Notion
    const page: any = await notionGet(`/pages/${recordId}`)
    return { props: page.properties || {}, recordId }
  }

  // POST mode: extract from request body
  const body = await request.json()

  // Notion automation webhook format: { source, data: { properties } }
  if (body?.data?.properties) {
    return { props: body.data.properties, recordId: body.data.id || null }
  }

  // Simple format: direct properties
  return { props: body, recordId: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ area: string }> }
) {
  return handleRequest(request, await params)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ area: string }> }
) {
  return handleRequest(request, await params)
}

async function handleRequest(request: NextRequest, { area }: { area: string }) {
  try {
    const config = AREA_DATA[area]
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown area: ${area}` }, { status: 400 })
    }

    const { props } = await getProperties(request, area)

    const vehicleId = extractRelation(props, 'Vehículo')
    if (!vehicleId) {
      return NextResponse.json({ success: false, error: 'No vehicle linked in this record' }, { status: 400 })
    }

    const updateProps: Record<string, any> = {}

    for (const dateField of config.dateFields) {
      const dateVal = extractDate(props, dateField)
      if (dateVal) {
        const targetKey = dateField === 'Fecha entrada taller' ? 'Fecha entrada taller'
          : dateField === 'Fecha inicio' ? 'Fecha entrada preparación'
          : dateField === 'Fecha de venta' ? 'Fecha de venta'
          : dateField
        updateProps[targetKey] = { date: { start: dateVal } }
      }
    }

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

    if (area === 'logistica') {
      const ubicacion = extractText(props, 'UBICACION')
      if (ubicacion) updateProps['Ubicación'] = { select: { name: ubicacion } }
    }

    if (area === 'ventas') {
      const precio = extractNumber(props, 'Precio de venta (€)')
      if (precio != null) updateProps['Precio venta (€)'] = { number: precio }
    }

    const observaciones = extractText(props, 'Observaciones')
    if (observaciones) {
      let existingNotas = ''
      try {
        const vehicle: any = await notionGet(`/pages/${vehicleId}`)
        existingNotas = vehicle.properties?.Notas?.rich_text?.[0]?.plain_text ?? ''
      } catch {}
      updateProps['Notas'] = { rich_text: [{ text: { content: existingNotas + `\n--- ${config.label} ---\n${observaciones}` } }] }
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
