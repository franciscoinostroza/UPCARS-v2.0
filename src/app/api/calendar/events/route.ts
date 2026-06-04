import { NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { getCalendarEvents } from '@/lib/notion/calendar-events'
import type { Vehicle } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface UnifiedEvent {
  id: string
  title: string
  start: string
  allDay: boolean
  type: string
  vehicleId?: string
  vehicleName?: string
}

interface MilestoneDef {
  key: string
  field: keyof Pick<Vehicle, 'fechaCompra' | 'fechaListo' | 'fechaEntradaTaller' | 'fechaEntradaPreparacion'>
  icon: string
  label: string
}

const MILESTONES: MilestoneDef[] = [
  { key: 'compra', field: 'fechaCompra', icon: '🚗', label: 'Compra' },
  { key: 'taller', field: 'fechaEntradaTaller', icon: '🔧', label: 'Taller' },
  { key: 'preparacion', field: 'fechaEntradaPreparacion', icon: '✨', label: 'Preparación' },
  { key: 'listo', field: 'fechaListo', icon: '🏷️', label: 'Listo venta' },
]

export async function GET() {
  try {
    const events: UnifiedEvent[] = []

    const [vehicles, opEvents, rrhhEvents] = await Promise.all([
      getVehicles(),
      getCalendarEvents('calendario_operativo').catch(() => [] as any[]),
      getCalendarEvents('calendario_rrhh').catch(() => [] as any[]),
    ])

    for (const v of vehicles) {
      for (const m of MILESTONES) {
        const date = v[m.field]
        if (date) {
          events.push({
            id: `${v.id}-${m.key}`,
            title: `${m.icon} ${m.label} - ${v.name}`,
            start: String(date),
            allDay: true,
            type: m.key,
            vehicleId: v.id,
            vehicleName: v.name,
          })
        }
      }
    }

    for (const e of opEvents) {
      events.push({ ...e, type: 'logistica' })
    }

    for (const e of rrhhEvents) {
      events.push({ ...e, type: 'rrhh' })
    }

    return NextResponse.json({ success: true, data: events })
  } catch (error: any) {
    console.error('Calendar events error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch calendar events' },
      { status: 500 }
    )
  }
}
