import { NextResponse } from 'next/server'
import { notionPost, notionPatch } from '@/lib/notion/client'

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
    const allData: any = await notionPost('/databases/36cf70f84701800887daf775e65d57f0/query')
    const pages = allData.results || []
    let migrados = 0
    let saltados = 0
    let errores = 0

    for (const page of pages) {
      const props = page.properties || {}
      const estadoActual = props['Estado Actual']?.select?.name || ''
      const yaTieneSituacion = props['Situación']?.select?.name
      const yaTieneUbicacion = props['Ubicación']?.select?.name

      if (yaTieneSituacion && yaTieneUbicacion && yaTieneSituacion !== 'Stock') {
        saltados++
        continue
      }
      if (yaTieneSituacion === 'Stock' && yaTieneUbicacion && yaTieneUbicacion !== 'Sede Central' && yaTieneUbicacion !== '') {
        saltados++
        continue
      }

      const mapping = MAP[estadoActual]
      if (!mapping) {
        saltados++
        continue
      }

      try {
        await notionPatch(`/pages/${page.id}`, {
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
      total: pages.length,
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
