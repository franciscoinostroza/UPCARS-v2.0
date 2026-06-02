import { getSupabase } from '@/lib/supabase/client'

export async function logVehicleEvent(event: {
  vehicleId: string
  vehicleName: string
  oldState: string | null
  newState: string
  timestamp: Date
}): Promise<void> {
  await getSupabase().from('vehicle_events').insert({
    vehicle_id: event.vehicleId,
    vehicle_name: event.vehicleName,
    old_state: event.oldState,
    new_state: event.newState,
    created_at: event.timestamp.toISOString(),
  } as never)
}
