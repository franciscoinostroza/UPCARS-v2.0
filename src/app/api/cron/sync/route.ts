import { NextRequest, NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { handleUbicacionChange, handleSituacionChange } from '@/lib/automations/vehicle-flow'
import { handleSLAChange } from '@/lib/automations/sla-engine'
import { logVehicleEvent } from '@/lib/automations/task-engine'
import { detectSituacionChanges, detectUbicacionChanges, fullResync } from '@/lib/automations/event-engine'
import { isValidSituacionTransition, isSituacionVendida } from '@/lib/automations/state-machine'
import { createVenta, getVentasByVehicle } from '@/lib/notion/ventas'
import { getEmployeeByRole, getEmployeesByNames, getEmployees } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'
import { createFinanzaRecord, getFinanzasByVehicle } from '@/lib/notion/finanzas'
import { SituacionComercial } from '@/lib/types'

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
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]))
    const snapshots = vehicles.map((v) => ({ id: v.id, name: v.name, situacion: v.situacion, ubicacion: v.ubicacion }))

    if (req.nextUrl.searchParams.get('resync') === 'true') {
      await fullResync(snapshots)
      return NextResponse.json({ success: true, message: 'Resync completed', vehiclesCount: snapshots.length })
    }

    const situacionChanges = await detectSituacionChanges(snapshots)
    const ubicacionChanges = await detectUbicacionChanges(snapshots)
    const now = new Date()
    const results = []

    for (const change of situacionChanges) {
      if (!isValidSituacionTransition(change.oldSit as SituacionComercial | null, change.newSit as SituacionComercial)) {
        results.push({ vehicleId: change.vehicleId, status: 'invalid_situacion', from: change.oldSit, to: change.newSit })
        continue
      }

      const vehicle = vehicleMap.get(change.vehicleId)
      const event = { vehicleId: change.vehicleId, vehicleName: change.vehicleName, oldSituacion: change.oldSit as any, newSituacion: change.newSit as any, oldUbicacion: vehicle?.ubicacion ?? null, newUbicacion: vehicle?.ubicacion ?? '', timestamp: now }

      await Promise.allSettled([
        handleSituacionChange(event),
        logVehicleEvent({ vehicleId: change.vehicleId, vehicleName: change.vehicleName, oldState: change.oldSit, newState: change.newSit, timestamp: now }),
      ])

      if (isSituacionVendida(change.newSit as SituacionComercial)) {
        const today = now.toISOString().split('T')[0]
        const existingVentas = await getVentasByVehicle(change.vehicleId)
        if (existingVentas.length === 0 && vehicle) {
          await createVenta({ nombre: `Venta - ${change.vehicleName}`, vehiculoId: change.vehicleId, fechaVenta: vehicle.fechaVendido || today, precioVenta: vehicle.precioVenta ?? null, vendedorId: vehicle.responsable ?? null }).catch(() => {})
        }
        const existingFin = await getFinanzasByVehicle(change.vehicleId)
        if (existingFin.length === 0 && vehicle?.margenBruto && vehicle.margenBruto !== 0) {
          await createFinanzaRecord({ concepto: change.vehicleName, tipo: vehicle.margenBruto > 0 ? 'Ingreso' : 'Egreso', categoria: 'Venta', importe: Math.abs(vehicle.margenBruto), fecha: vehicle.fechaVendido || today, vehiculoId: change.vehicleId, notas: `Margen: ${vehicle.margenBruto}€` }).catch(() => {})
        }
      }

      results.push({ vehicleId: change.vehicleId, type: 'situacion', from: change.oldSit, to: change.newSit })
    }

    for (const change of ubicacionChanges) {
      const vehicle = vehicleMap.get(change.vehicleId)
      const event = { vehicleId: change.vehicleId, vehicleName: change.vehicleName, oldSituacion: vehicle?.situacion ?? 'Stock', newSituacion: vehicle?.situacion ?? 'Stock', oldUbicacion: change.oldUbi, newUbicacion: change.newUbi, timestamp: now }

      await Promise.allSettled([
        handleUbicacionChange(event),
        handleSLAChange(change.vehicleId, change.vehicleName, change.oldUbi, change.newUbi, now),
        logVehicleEvent({ vehicleId: change.vehicleId, vehicleName: change.vehicleName, oldState: change.oldUbi, newState: change.newUbi, timestamp: now }),
      ])

      const ubi = change.newUbi
      let emails: string[] = []
      if (ubi === 'En tránsito') { const e = await getEmployeeByRole('Logística'); if (e?.email) emails = [e.email] }
      else if (ubi === 'Taller Mecánica') { const e = await getEmployeeByRole('Mecánico'); if (e?.email) emails = [e.email] }
      else if (ubi === 'Taller Chapa') { const emps = await getEmployeesByNames(['Luis Miguel', 'Víctor', 'José']); emails = emps.map(e => e.email).filter(Boolean) }
      else if (ubi === 'Taller Preparación') { const e = await getEmployeeByRole('Preparador'); if (e?.email) emails = [e.email] }
      if (emails.length > 0) {
        await createNotificacion(`🚗 ${change.vehicleName} → ${ubi}`, null, emails).catch(() => {})
      }

      results.push({ vehicleId: change.vehicleId, type: 'ubicacion', from: change.oldUbi, to: change.newUbi })
    }

    return NextResponse.json({ success: true, situacionChanges: situacionChanges.length, ubicacionChanges: ubicacionChanges.length, results })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ success: false, error: 'Sync failed' }, { status: 500 })
  }
}
