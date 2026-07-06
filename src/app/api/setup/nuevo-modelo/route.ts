import { NextResponse } from 'next/server'
import { notionGet, notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const VEHICLES_DB_ID = '36cf70f84701800887daf775e65d57f0'

const NEW_STATE_OPTIONS = [
  { name: 'Logística - Pendiente autorización', color: 'gray' },
  { name: 'Logística - Autorizado', color: 'blue' },
  { name: 'Logística - Recogido', color: 'green' },
  { name: 'Logística - Entregado', color: 'green' },
  { name: 'Taller - Pendiente', color: 'gray' },
  { name: 'Taller - En proceso', color: 'yellow' },
  { name: 'Taller - Finalizado', color: 'green' },
  { name: 'Chapa - Pendiente', color: 'gray' },
  { name: 'Chapa - En proceso', color: 'purple' },
  { name: 'Chapa - Finalizado', color: 'green' },
  { name: 'Preparación - Pendiente', color: 'gray' },
  { name: 'Preparación - En proceso', color: 'pink' },
  { name: 'Preparación - Finalizado', color: 'green' },
  { name: 'Exposición', color: 'blue' },
]

export async function GET() {
  try {
    // Add new date columns (these don't exist yet)
    const dateProps: Record<string, any> = {
      'Inicio Logística': { date: {} },
      'Fin Logística': { date: {} },
      'Inicio Taller': { date: {} },
      'Fin Taller': { date: {} },
      'Inicio Chapa': { date: {} },
      'Fin Chapa': { date: {} },
      'Inicio Preparación': { date: {} },
      'Fin Preparación': { date: {} },
    }

    await notionPatch(`/databases/${VEHICLES_DB_ID}`, { properties: dateProps }).catch(e => console.log('Date cols may already exist:', e.message))

    // Add new options to existing Estado Actual column
    const schema: any = await notionGet(`/databases/${VEHICLES_DB_ID}`)
    const existingOptions = schema.properties?.['Estado Actual']?.select?.options || []
    const existingNames = new Set(existingOptions.map((o: any) => o.name))

    const optionsToAdd = NEW_STATE_OPTIONS.filter(o => !existingNames.has(o.name))
    if (optionsToAdd.length > 0) {
      const mergedOptions = [...existingOptions, ...optionsToAdd]
      await notionPatch(`/databases/${VEHICLES_DB_ID}`, {
        properties: {
          'Estado Actual': { select: { options: mergedOptions } },
        },
      })
    }

    const result: any = await notionGet(`/databases/${VEHICLES_DB_ID}`)
    const stateOpts = result.properties?.['Estado Actual']?.select?.options || []
    const dateCols = Object.entries(result.properties || {})
      .filter(([, v]: any) => v.type === 'date')
      .map(([k]) => k)

    return NextResponse.json({
      success: true,
      stateOptions: stateOpts.map((o: any) => o.name),
      dateColumns: dateCols,
      added: optionsToAdd.length,
    })
  } catch (error: any) {
    console.error('Setup nuevo modelo error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
