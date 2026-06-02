import { supabase } from '@/lib/supabase/client'

export interface SyncResult {
  changesDetected: number
  changesProcessed: number
  errors: string[]
}

let lastKnownState: Map<string, string> = new Map()

export async function detectChanges(allVehicles: { id: string; name: string; state: string }[]): Promise<
  { vehicleId: string; vehicleName: string; oldState: string | null; newState: string }[]
> {
  const changes: { vehicleId: string; vehicleName: string; oldState: string | null; newState: string }[] = []

  for (const v of allVehicles) {
    const oldState = lastKnownState.get(v.id) || null
    if (oldState !== v.state) {
      changes.push({
        vehicleId: v.id,
        vehicleName: v.name,
        oldState,
        newState: v.state,
      })
    }
  }

  for (const v of allVehicles) {
    lastKnownState.set(v.id, v.state)
  }

  return changes
}

export async function fullResync(
  vehicles: { id: string; name: string; state: string }[]
): Promise<void> {
  lastKnownState.clear()
  for (const v of vehicles) {
    lastKnownState.set(v.id, v.state)
  }
}
