import { supabase } from '@/lib/supabase/client'
import { StateChangeEvent } from '@/lib/types'

export async function logVehicleEvent(event: StateChangeEvent): Promise<void> {
  await supabase.from('vehicle_events').insert({
    vehicle_id: event.vehicleId,
    vehicle_name: event.vehicleName,
    old_state: event.oldState,
    new_state: event.newState,
    created_at: event.timestamp.toISOString(),
  })
}
