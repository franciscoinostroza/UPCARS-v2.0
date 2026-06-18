import { NextRequest, NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { handleVehicleStateChange } from '@/lib/automations/vehicle-flow'
import { handleSLAChange } from '@/lib/automations/sla-engine'
import { logVehicleEvent } from '@/lib/automations/task-engine'
import { detectChanges, fullResync } from '@/lib/automations/event-engine'
import { isValidTransition } from '@/lib/automations/state-machine'
import { createVenta, getVentasByVehicle } from '@/lib/notion/ventas'
import { getEmployeeByRole, getEmployeesByNames, getEmployees } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'
import { createFinanzaRecord, getFinanzasByVehicle } from '@/lib/notion/finanzas'
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
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]))
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

      await (async () => {
        const vehicle = vehicleMap.get(change.vehicleId)
        let emails: string[] = []
        const stateLabel = to.replace('En ', '').replace('_', ' ')
        if (to === 'En logística') {
          const e = await getEmployeeByRole('Logística')
          if (e?.email) emails = [e.email]
        } else if (to === 'En taller') {
          const e = await getEmployeeByRole('Mecánico')
          if (e?.email) emails = [e.email]
        } else if (to === 'En chapa') {
          const emps = await getEmployeesByNames(['Luis Miguel', 'Víctor', 'José'])
          emails = emps.map(e => e.email).filter(Boolean)
        } else if (to === 'En preparación') {
          const e = await getEmployeeByRole('Preparador')
          if (e?.email) emails = [e.email]
        } else if (to === 'Listo para venta') {
          const emps = await getEmployeesByNames(['Luis Miguel', 'José'])
          emails = emps.map(e => e.email).filter(Boolean)
        } else if (to === 'Autorizado' && vehicle?.responsable) {
          const allEmps = await getEmployees()
          const conductor = allEmps.find(e => e.id === vehicle.responsable)
          if (conductor?.email) emails = [conductor.email]
        } else if (to === 'Entregado al concesionario') {
          const e = await getEmployeeByRole('Preparador')
          if (e?.email) emails = [e.email]
        }
        if (emails.length > 0) {
          await createNotificacion(
            `🚗 ${change.vehicleName} → ${stateLabel}`,
            null,
            emails
          ).catch(err => console.error('Notificación cambio estado falló:', err))
        }
      })()

      if (to === 'Vendido') {
        const vehicle = vehicleMap.get(change.vehicleId)
        const today = now.toISOString().split('T')[0]

        const existingVentas = await getVentasByVehicle(change.vehicleId)
        if (existingVentas.length === 0) {
          await createVenta({
            nombre: `Venta - ${change.vehicleName}`,
            vehiculoId: change.vehicleId,
            fechaVenta: vehicle?.fechaVendido || today,
            precioVenta: vehicle?.precioVenta ?? null,
            vendedorId: vehicle?.responsable ?? null,
          }).catch((err) => console.error('Auto-create venta failed:', err))
        }

        const existingFin = await getFinanzasByVehicle(change.vehicleId)
        if (existingFin.length === 0) {
          const margen = (vehicle?.margenBruto ?? 0)
          if (margen !== 0) {
            await createFinanzaRecord({
              concepto: `${change.vehicleName}`,
              tipo: margen > 0 ? 'Ingreso' : 'Egreso',
              categoria: 'Venta',
              importe: Math.abs(margen),
              fecha: vehicle?.fechaVendido || today,
              vehiculoId: change.vehicleId,
              lineaNegocio: vehicle?.lineaNegocio || undefined,
              notas: `Compra: ${vehicle?.precioCompra ?? '?'}€ · Venta: ${vehicle?.precioVenta ?? '?'}€ · Margen: ${margen}€`,
            }).catch((err) => console.error('Auto-create finanza combinada failed:', err))
          }
        }
      }

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
