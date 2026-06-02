import { NextRequest, NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { handleVehicleStateChange } from '@/lib/automations/vehicle-flow'
import { handleSLAChange } from '@/lib/automations/sla-engine'
import { logVehicleEvent } from '@/lib/automations/task-engine'
import { detectChanges, fullResync } from '@/lib/automations/event-engine'
import { isValidTransition } from '@/lib/automations/state-machine'
import { VehicleState } from '@/lib/types'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const vehicles = await getVehicles()
    const vehicleStates = vehicles.map((v) => ({ id: v.id, name: v.name, state: v.state }))

    const fullResyncFlag = req.nextUrl.searchParams.get('resync') === 'true'
    if (fullResyncFlag) {
      await fullResync(vehicleStates)
      return NextResponse.json({ success: true, message: 'Resync completed', vehiclesCount: vehicleStates.length })
    }

    const changes = await detectChanges(vehicleStates)
    const results = []

    for (const change of changes) {
      const from = change.oldState as VehicleState | null
      const to = change.newState as VehicleState
      const now = new Date()

      if (!isValidTransition(from, to)) {
        results.push({
          vehicleId: change.vehicleId,
          status: 'invalid_transition',
          from: change.oldState,
          to: change.newState,
        })
        continue
      }

      await Promise.allSettled([
        handleVehicleStateChange({
          vehicleId: change.vehicleId,
          vehicleName: change.vehicleName,
          oldState: from,
          newState: to,
          timestamp: now,
        }),
        handleSLAChange(change.vehicleId, change.vehicleName, from, to, now),
        logVehicleEvent({
          vehicleId: change.vehicleId,
          vehicleName: change.vehicleName,
          oldState: from,
          newState: to,
          timestamp: now,
        }),
      ])

      results.push({
        vehicleId: change.vehicleId,
        status: 'processed',
        from: change.oldState,
        to: change.newState,
      })
    }

    return NextResponse.json({
      success: true,
      changesDetected: changes.length,
      changesProcessed: results.length,
      results,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    )
  }
}
