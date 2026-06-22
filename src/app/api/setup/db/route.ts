import { NextResponse } from 'next/server'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const VEHICLES_DB_ID = '36cf70f84701800887daf775e65d57f0'

export async function GET() {
  try {
    const result: any = await notionPatch(`/databases/${VEHICLES_DB_ID}`, {
      properties: {
        'Situación': {
          select: {
            options: [
              { name: 'Stock', color: 'green' },
              { name: 'Exposición', color: 'blue' },
              { name: 'Vendido', color: 'purple' },
              { name: 'Cedido', color: 'gray' },
            ],
          },
        },
        'Ubicación': {
          select: {
            options: [
              { name: 'Sede Central', color: 'green' },
              { name: 'En tránsito', color: 'yellow' },
              { name: 'Taller Mecánica', color: 'orange' },
              { name: 'Taller Chapa', color: 'purple' },
              { name: 'Taller Preparación', color: 'pink' },
            ],
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      properties: Object.keys(result.properties || {}),
    })
  } catch (error: any) {
    console.error('Setup DB error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to setup DB' },
      { status: 500 }
    )
  }
}
