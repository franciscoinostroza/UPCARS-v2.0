// No supabase needed in event-engine

let lastKnownSituacion: Map<string, string> = new Map()
let lastKnownUbicacion: Map<string, string> = new Map()

export async function detectSituacionChanges(allVehicles: { id: string; name: string; situacion: string }[]): Promise<
  { vehicleId: string; vehicleName: string; oldSit: string | null; newSit: string }[]
> {
  const changes: { vehicleId: string; vehicleName: string; oldSit: string | null; newSit: string }[] = []
  for (const v of allVehicles) {
    const old = lastKnownSituacion.get(v.id) || null
    if (old !== v.situacion) changes.push({ vehicleId: v.id, vehicleName: v.name, oldSit: old, newSit: v.situacion })
  }
  for (const v of allVehicles) lastKnownSituacion.set(v.id, v.situacion)
  return changes
}

export async function detectUbicacionChanges(allVehicles: { id: string; name: string; ubicacion: string }[]): Promise<
  { vehicleId: string; vehicleName: string; oldUbi: string | null; newUbi: string }[]
> {
  const changes: { vehicleId: string; vehicleName: string; oldUbi: string | null; newUbi: string }[] = []
  for (const v of allVehicles) {
    const old = lastKnownUbicacion.get(v.id) || null
    if (old !== v.ubicacion) changes.push({ vehicleId: v.id, vehicleName: v.name, oldUbi: old, newUbi: v.ubicacion })
  }
  for (const v of allVehicles) lastKnownUbicacion.set(v.id, v.ubicacion)
  return changes
}

export async function fullResync(
  vehicles: { id: string; name: string; situacion: string; ubicacion: string }[]
): Promise<void> {
  lastKnownSituacion.clear()
  lastKnownUbicacion.clear()
  for (const v of vehicles) {
    lastKnownSituacion.set(v.id, v.situacion)
    lastKnownUbicacion.set(v.id, v.ubicacion)
  }
}
