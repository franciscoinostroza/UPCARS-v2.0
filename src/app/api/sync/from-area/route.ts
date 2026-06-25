import { NextRequest, NextResponse } from 'next/server'
import { notionGet, notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const AREA_LABELS: Record<string, string> = {
  logistica: 'Logística',
  taller: 'Taller',
  chapa: 'Chapa y Pintura',
  preparacion: 'Preparación',
  ventas: 'Ventas',
}

interface AreaConfig {
  dbKey: string
  fieldMappings: { from: string; to: string; type: 'select' | 'date' | 'number' | 'relation' }[]
  observacionesKey?: string
  ubicacionKey?: string
  responsableKey?: string
}

const AREA_CONFIGS: Record<string, AreaConfig> = {
  logistica: {
    dbKey: 'logistics',
    fieldMappings: [
      { from: 'Fecha programada', to: '', type: 'date' },
    ],
    ubicacionKey: 'UBICACION',
    responsableKey: 'Responsable',
    observacionesKey: 'Observaciones',
  },
  taller: {
    dbKey: 'workshop',
    fieldMappings: [
      { from: 'Fecha entrada taller', to: 'Fecha entrada taller', type: 'date' },
    ],
    responsableKey: 'Mecánico asignado',
    observacionesKey: 'Observaciones',
  },
  chapa: {
    dbKey: 'chapa',
    fieldMappings: [],
    observacionesKey: 'Observaciones',
  },
  preparacion: {
    dbKey: 'preparacion',
    fieldMappings: [
      { from: 'Fecha inicio', to: 'Fecha entrada preparación', type: 'date' },
    ],
    responsableKey: 'Preparador',
    observacionesKey: 'Observaciones',
  },
  ventas: {
    dbKey: 'ventas',
    fieldMappings: [
      { from: 'Precio de venta (€)', to: 'Precio venta (€)', type: 'number' },
      { from: 'Fecha de venta', to: 'Fecha de venta', type: 'date' },
    ],
    responsableKey: 'Vendedor',
    observacionesKey: 'Observaciones',
  },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { area, vehicleId, recordId } = body

    if (!area || !vehicleId || !recordId) {
      return NextResponse.json({ success: false, error: 'area, vehicleId and recordId are required' }, { status: 400 })
    }

    const config = AREA_CONFIGS[area]
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown area: ${area}` }, { status: 400 })
    }

    // Read the area record from Notion
    const record: any = await notionGet(`/pages/${recordId}`)
    const rp = record.properties || {}

    // Read the current vehicle
    const vehicle: any = await notionGet(`/pages/${vehicleId}`)
    const vp = vehicle.properties || {}

    // Build the update payload
    const properties: Record<string, any> = {}

    // Map fields
    for (const mapping of config.fieldMappings) {
      const fromVal = rp[mapping.from]
      if (!fromVal) continue

      if (mapping.type === 'date' && fromVal.date?.start) {
        properties[mapping.to] = { date: { start: fromVal.date.start } }
      } else if (mapping.type === 'number' && fromVal.number != null) {
        properties[mapping.to] = { number: fromVal.number }
      }
    }

    // Ubicacion (logistica)
    if (config.ubicacionKey) {
      const ubiVal = rp[config.ubicacionKey]?.rich_text?.[0]?.plain_text
      if (ubiVal) {
        properties['Ubicación'] = { select: { name: ubiVal } }
      }
    }

    // Responsable
    if (config.responsableKey) {
      const respRel = rp[config.responsableKey]?.relation?.[0]?.id
      if (respRel) {
        properties['Responsable Actual'] = { relation: [{ id: respRel }] }
      }
    }

    // Append observaciones to Notas
    if (config.observacionesKey) {
      const obsVal = rp[config.observacionesKey]?.rich_text?.[0]?.plain_text
      if (obsVal) {
        const existingNotas = vp['Notas']?.rich_text?.[0]?.plain_text || ''
        const newEntry = `\n--- ${AREA_LABELS[area]} ---\n${obsVal}`
        properties['Notas'] = { rich_text: [{ text: { content: existingNotas + newEntry } }] }
      }
    }

    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${vehicleId}`, { properties })

    return NextResponse.json({
      success: true,
      updated: Object.keys(properties),
    })
  } catch (error: any) {
    console.error('Sync from-area error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Sync failed' },
      { status: 500 }
    )
  }
}
