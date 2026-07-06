import { NextResponse } from 'next/server'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const VEHICLES_DB_ID = '36cf70f84701800887daf775e65d57f0'

const NEW_STATES = [
  'Logística - Pendiente autorización',
  'Logística - Autorizado',
  'Logística - Recogido',
  'Logística - Entregado',
  'Taller - Pendiente',
  'Taller - En proceso',
  'Taller - Finalizado',
  'Chapa - Pendiente',
  'Chapa - En proceso',
  'Chapa - Finalizado',
  'Preparación - Pendiente',
  'Preparación - En proceso',
  'Preparación - Finalizado',
  'Stock',
  'Exposición',
  'Cedido',
  'Vendido',
]

const STATE_COLORS = [
  'gray', 'blue', 'green', 'green',
  'gray', 'yellow', 'green',
  'gray', 'purple', 'green',
  'gray', 'pink', 'green',
  'default', 'blue', 'gray', 'red',
]

export async function GET() {
  try {
    const properties: Record<string, any> = {
      'Estado Actual': {
        select: {
          options: NEW_STATES.map((name, i) => ({
            name,
            color: STATE_COLORS[i] || 'default',
          })),
        },
      },
      'Inicio Logística': { date: {} },
      'Fin Logística': { date: {} },
      'Inicio Taller': { date: {} },
      'Fin Taller': { date: {} },
      'Inicio Chapa': { date: {} },
      'Fin Chapa': { date: {} },
      'Inicio Preparación': { date: {} },
      'Fin Preparación': { date: {} },
    }

    const result: any = await notionPatch(`/databases/${VEHICLES_DB_ID}`, { properties })

    return NextResponse.json({
      success: true,
      properties: Object.keys(result.properties || {}),
      message: 'Columnas creadas. Ahora ejecutá /api/setup/migrar-estados para migrar los datos viejos.',
    })
  } catch (error: any) {
    console.error('Setup nuevo modelo error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
