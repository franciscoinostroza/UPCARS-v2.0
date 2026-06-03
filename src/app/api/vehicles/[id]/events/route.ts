import { NextRequest, NextResponse } from 'next/server'
import { getVehicle } from '@/lib/notion/vehicles'
import { getSupabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const vehicle = await getVehicle(id)
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found in Notion' },
        { status: 404 }
      )
    }

    const db = getSupabase()

    const [eventsRes, slasRes] = await Promise.all([
      db.from('vehicle_events')
        .select('*')
        .eq('vehicle_id', id)
        .order('created_at', { ascending: true }),
      db.from('sla_records')
        .select('*')
        .eq('vehicle_id', id)
        .order('start_time', { ascending: true }),
    ])

    const events = (eventsRes.data || []) as {
      id: number
      vehicle_id: string
      vehicle_name: string
      old_state: string | null
      new_state: string
      created_at: string
    }[]

    const slas = (slasRes.data || []) as {
      id: number
      vehicle_id: string
      area: string
      start_time: string
      end_time: string | null
      threshold: number
      met: boolean | null
      created_at: string
    }[]

    const eventsWithDays = events.map((e, i) => {
      const nextEvent = events[i + 1]
      const endTime = nextEvent ? new Date(nextEvent.created_at).getTime() : Date.now()
      const startTime = new Date(e.created_at).getTime()
      const daysInState = Math.round((endTime - startTime) / (1000 * 60 * 60 * 24) * 10) / 10
      return {
        id: e.id,
        vehicleName: e.vehicle_name,
        oldState: e.old_state,
        newState: e.new_state,
        createdAt: e.created_at,
        daysInState,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        vehicle: {
          id: vehicle.id,
          name: vehicle.name,
          state: vehicle.state as string,
          responsable: vehicle.responsable || null,
          fechaCompra: vehicle.fechaCompra || null,
          fechaListo: vehicle.fechaListo || null,
        },
        events: eventsWithDays,
        slas: slas.map((s) => ({
          id: s.id,
          area: s.area,
          startTime: s.start_time,
          endTime: s.end_time,
          threshold: s.threshold,
          met: s.met,
          hoursTaken: s.end_time
            ? Math.round((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60) * 10) / 10
            : null,
        })),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vehicle events' },
      { status: 500 }
    )
  }
}
