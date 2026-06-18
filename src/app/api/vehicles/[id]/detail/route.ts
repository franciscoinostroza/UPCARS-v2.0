import { NextRequest, NextResponse } from 'next/server'
import { getVehicle } from '@/lib/notion/vehicles'
import { getTasks } from '@/lib/notion/tasks'
import { getWorkshopOrders } from '@/lib/notion/workshop'
import { getSupabase } from '@/lib/supabase/client'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const [vehicle, tasks, workshops, employees] = await Promise.all([
      getVehicle(id),
      getTasks(),
      getWorkshopOrders(),
      getEmployees(),
    ])

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    const { data: events } = await getSupabase()
      .from('vehicle_events')
      .select('*')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: true })

    const vehicleTasks = tasks.filter(t => t.vehicleId === id)
    const vehicleWorkshops = workshops.filter(w => w.vehicleId === id)
    const vehicleEvents = (events || []) as any[]

    const empMap = new Map(employees.map(e => [e.id, e.name]))

    const timeline = vehicleEvents.map((e: any) => ({
      id: e.id,
      fecha: e.created_at,
      oldState: e.old_state,
      newState: e.new_state,
    }))

    const daysInState = vehicle.fechaCompra
      ? Math.round((Date.now() - new Date(vehicle.fechaCompra).getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return NextResponse.json({
      success: true,
      data: {
        vehicle,
        daysInState,
        events: vehicleEvents,
        timeline,
        tasks: vehicleTasks.map(t => ({
          ...t,
          responsableNombre: t.responsibleIds.map(id => empMap.get(id) || 'Desconocido').join(', '),
        })),
        workshops: vehicleWorkshops.map(w => ({
          ...w,
          responsableNombre: w.responsableId ? (empMap.get(w.responsableId) || 'Desconocido') : null,
        })),
      },
    })
  } catch (error: any) {
    console.error('Vehicle detail GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vehicle detail' },
      { status: 500 }
    )
  }
}
