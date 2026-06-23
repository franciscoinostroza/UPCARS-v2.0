import { NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const MAP: Record<string, { situacion: string; ubicacion: string }> = {
  'Comprado': { situacion: 'Stock', ubicacion: 'Sede Central' },
  'Pendiente autorización': { situacion: 'Stock', ubicacion: 'Sede Central' },
  'Autorizado': { situacion: 'Stock', ubicacion: 'Sede Central' },
  'En logística': { situacion: 'Stock', ubicacion: 'En tránsito' },
  'En taller': { situacion: 'Stock', ubicacion: 'Taller Mecánica' },
  'En chapa': { situacion: 'Stock', ubicacion: 'Taller Chapa' },
  'En preparación': { situacion: 'Stock', ubicacion: 'Taller Preparación' },
  'Entregado al concesionario': { situacion: 'Stock', ubicacion: 'Sede Central' },
  'Listo para venta': { situacion: 'Stock', ubicacion: 'Sede Central' },
  'Vendido': { situacion: 'Vendido', ubicacion: 'Sede Central' },
  'Cedido': { situacion: 'Cedido', ubicacion: 'Sede Central' },
}

export async function GET() {
  try {
    const vehicles = await getVehicles()
    let migrados = 0
    let saltados = 0
    let errores = 0

    for (const v of vehicles) {
      const oldEstado = (v as any).state || ''
      const mapping = MAP[oldEstado]
      if (!mapping) {
        saltados++
        continue
      }

      if (v.situacion && v.ubicacion) {
        saltados++
        continue
      }

      try {
        await notionPatch(`/pages/${v.id}`, {
          properties: {
            'Situación': { select: { name: mapping.situacion } },
            'Ubicación': { select: { name: mapping.ubicacion } },
          },
        })
        migrados++
      } catch {
        errores++
      }
    }

    return NextResponse.json({
      success: true,
      total: vehicles.length,
      migrados,
      saltados,
      errores,
    })
  } catch (error: any) {
    console.error('Migrate error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
