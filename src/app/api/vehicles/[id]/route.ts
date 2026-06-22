import { NextRequest, NextResponse } from 'next/server'
import { getVehicle } from '@/lib/notion/vehicles'
import { notionPatch } from '@/lib/notion/client'
import { isValidSituacionTransition } from '@/lib/automations/state-machine'
import { SituacionComercial } from '@/lib/types'
import { getDbSchema, findPropertiesByType } from '@/lib/notion/schema'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { situacion, ubicacion } = body

    if (!situacion && !ubicacion) {
      return NextResponse.json(
        { success: false, error: 'situacion or ubicacion required' },
        { status: 400 }
      )
    }

    const vehicle = await getVehicle(id)
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    const schema = await getDbSchema('vehicles')
    const selects = findPropertiesByType(schema, 'select')

    if (situacion) {
      if (!isValidSituacionTransition(vehicle.situacion as SituacionComercial | null, situacion as SituacionComercial)) {
        return NextResponse.json({ success: false, error: `Cannot transition from ${vehicle.situacion} to ${situacion}` }, { status: 400 })
      }
      const situacionKey = selects.find(s => s.name === 'Situación')?.name || selects[0]?.name
      if (situacionKey) {
        await notionPatch(`/pages/${id}`, { properties: { [situacionKey]: { select: { name: situacion } } } })
      }
    }

    if (ubicacion) {
      const ubicacionKey = selects.find(s => s.name === 'Ubicación')?.name || selects[1]?.name
      if (ubicacionKey) {
        await notionPatch(`/pages/${id}`, { properties: { [ubicacionKey]: { select: { name: ubicacion } } } })
      }
    }

    return NextResponse.json({
      success: true,
      data: { id, oldSituacion: vehicle.situacion, newSituacion: situacion || vehicle.situacion, oldUbicacion: vehicle.ubicacion, newUbicacion: ubicacion || vehicle.ubicacion },
    })
  } catch (error: any) {
    console.error('Vehicle PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}
