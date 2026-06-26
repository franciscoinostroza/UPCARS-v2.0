import { StateChangeEvent } from '@/lib/types'
import { createWorkshopOrder } from '@/lib/notion/workshop'
import { createTask } from '@/lib/notion/tasks'
import { getEmployeeByRole } from '@/lib/notion/employees'
import { setVehicleDate } from '@/lib/notion/vehicles'
import { createCalendarEvent } from '@/lib/notion/calendar'
import { createChapaRecord } from '@/lib/notion/chapa'

const UBICACION_TO_AREA: Record<string, string> = {
  'Taller Mecánica': 'Taller',
  'Taller Chapa': 'Chapa',
  'Taller Preparación': 'Preparacion',
  'En tránsito': 'Logistica',
}

export async function handleUbicacionChange(event: StateChangeEvent): Promise<void> {
  const ubi = event.newUbicacion
  switch (ubi) {
    case 'En tránsito':
      await handleTransito(event)
      break
    case 'Taller Mecánica':
      await handleTaller(event)
      break
    case 'Taller Chapa':
      await handleChapa(event)
      break
    case 'Taller Preparación':
      await handlePreparacion(event)
      break
  }
}

export async function handleSituacionChange(event: StateChangeEvent): Promise<void> {
  if (event.newSituacion === 'Vendido') {
    await handleVendido(event)
  }
}

async function handleTransito(event: StateChangeEvent) {
  const logistico = await getEmployeeByRole('Logística')
  const today = new Date().toISOString().split('T')[0]
  await createCalendarEvent(event.vehicleName, logistico?.id || null, today)
  await createWorkshopOrder('Logistica', event.vehicleId, logistico?.id || null, 'Traslado de vehículo')
  await createTask({ name: `Gestionar traslado - ${event.vehicleName}`, area: 'Logística', priority: 'Alta', vehicleId: event.vehicleId, responsibleIds: logistico ? [logistico.id] : [] })
}

async function handleTaller(event: StateChangeEvent) {
  const mecanico = await getEmployeeByRole('Mecánico')
  await createWorkshopOrder('Taller', event.vehicleId, mecanico?.id || null, 'Revisión mecánica general')
  await createTask({ name: `Revisión mecánica - ${event.vehicleName}`, area: 'Taller', priority: 'Alta', vehicleId: event.vehicleId, responsibleIds: mecanico ? [mecanico.id] : [] })
}

async function handleChapa(event: StateChangeEvent) {
  await createChapaRecord(event.vehicleId, event.vehicleName, undefined, 'Salida a proveedor externo para chapa y pintura')
  await createTask({ name: `Gestionar chapa y pintura - ${event.vehicleName}`, area: 'Taller', priority: 'Alta', vehicleId: event.vehicleId })
}

async function handlePreparacion(event: StateChangeEvent) {
  const preparador = await getEmployeeByRole('Preparador')
  await createWorkshopOrder('Preparacion', event.vehicleId, preparador?.id || null, 'Preparación y limpieza')
  await createTask({ name: `Checklist limpieza - ${event.vehicleName}`, area: 'Taller', priority: 'Alta', vehicleId: event.vehicleId, responsibleIds: preparador ? [preparador.id] : [] })
  await createTask({ name: `Preparar vehículo - ${event.vehicleName}`, area: 'Taller', priority: 'Alta', vehicleId: event.vehicleId, responsibleIds: preparador ? [preparador.id] : [] })
}

async function handleVendido(event: StateChangeEvent) {
  const today = new Date().toISOString().split('T')[0]
  await setVehicleDate(event.vehicleId, ['listo', 'venta'], today)
  await createTask({ name: `Publicar vehículo - ${event.vehicleName}`, area: 'Marketing', priority: 'Media', vehicleId: event.vehicleId })
  await createTask({ name: `Gestionar venta - ${event.vehicleName}`, area: 'Ventas', priority: 'Alta', vehicleId: event.vehicleId })
}
