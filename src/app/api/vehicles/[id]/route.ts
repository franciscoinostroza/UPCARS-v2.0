import { NextRequest, NextResponse } from 'next/server'
import { updateVehicleStatus, getVehicle } from '@/lib/notion/vehicles'
import { isValidTransition } from '@/lib/automations/state-machine'
import { VehicleState } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { state: newState } = body

    if (!newState) {
      return NextResponse.json(
        { success: false, error: 'state is required' },
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

    if (!isValidTransition(vehicle.state as VehicleState | null, newState as VehicleState)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${vehicle.state} to ${newState}`,
        },
        { status: 400 }
      )
    }

    await updateVehicleStatus(id, newState)

    return NextResponse.json({
      success: true,
      data: { id, oldState: vehicle.state, newState },
    })
  } catch (error: any) {
    console.error('Vehicle PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}
