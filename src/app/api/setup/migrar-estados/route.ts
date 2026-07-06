import { NextResponse } from 'next/server'
import { notionPost, notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const VEHICLES_DB_ID = '36cf70f84701800887daf775e65d57f0'

const OLD_TO_NEW: Record<string, string> = {
  'Comprado': 'Stock',
  'Pendiente autorización': 'Logística - Pendiente autorización',
  'Autorizado': 'Logística - Autorizado',
  'Entregado al concesionario': 'Logística - Entregado',
  'En logística': 'Logística - En proceso',
  'En taller': 'Taller - En proceso',
  'En chapa': 'Chapa - En proceso',
  'En preparación': 'Preparación - En proceso',
  'Listo para venta': 'Stock',
  'Vendido': 'Vendido',
  'Cedido': 'Cedido',
}

const NEW_TO_INICIO: Record<string, string> = {
  'Taller - En proceso': 'Inicio Taller',
  'Chapa - En proceso': 'Inicio Chapa',
  'Preparación - En proceso': 'Inicio Preparación',
  'Logística - Autorizado': 'Inicio Logística',
}

export async function GET() {
  try {
    const data: any = await notionPost(`/databases/${VEHICLES_DB_ID}/query`)
    const pages = data.results || []
    let migrados = 0
    let saltados = 0
    let errores = 0

    for (const page of pages) {
      const props = page.properties || {}
      const oldState = props['Estado Actual']?.select?.name || ''
      const newState = OLD_TO_NEW[oldState]
      if (!newState) {
        saltados++
        continue
      }

      const updateProps: Record<string, any> = {
        'Estado Actual': { select: { name: newState } },
      }

      const inicioKey = NEW_TO_INICIO[newState]
      if (inicioKey && !props[inicioKey]?.date?.start) {
        const now = new Date().toISOString()
        updateProps[inicioKey] = { date: { start: now } }
      }

      try {
        await notionPatch(`/pages/${page.id}`, { properties: updateProps })
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
    console.error('Migrate estados error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
