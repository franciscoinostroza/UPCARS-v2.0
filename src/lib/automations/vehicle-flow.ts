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
  await createTask(
    `Gestionar traslado - ${event.vehicleName}`,
    event.vehicleId,
    logistico ? [logistico.id] : [],
    'Alta',
    'Logística'
  )
}

async function handleTaller(event: StateChangeEvent) {
  const mecanico = await getEmployeeByRole('Mecánico')
  await createWorkshopOrder('Taller', event.vehicleId, mecanico?.id || null, 'Revisión mecánica general')
  await createTask(
    `Revisión mecánica - ${event.vehicleName}`,
    event.vehicleId,
    mecanico ? [mecanico.id] : [],
    'Alta',
    'Taller'
  )
}

async function handleChapa(event: StateChangeEvent) {
  await createChapaRecord(event.vehicleId, event.vehicleName, undefined, 'Salida a proveedor externo para chapa y pintura')
  await createTask(
    `Gestionar chapa y pintura - ${event.vehicleName}`,
    event.vehicleId,
    [],
    'Alta',
    'Taller'
  )
}

async function handlePreparacion(event: StateChangeEvent) {
  const preparador = await getEmployeeByRole('Preparador')
  await createWorkshopOrder('Preparacion', event.vehicleId, preparador?.id || null, 'Preparación y limpieza')
  await createTask(
    `Checklist limpieza - ${event.vehicleName}`,
    event.vehicleId,
    preparador ? [preparador.id] : [],
    'Alta',
    'Taller'
  )
  await createTask(
    `Preparar vehículo - ${event.vehicleName}`,
    event.vehicleId,
    preparador ? [preparador.id] : [],
    'Alta',
    'Taller'
  )
}

async function handleVendido(event: StateChangeEvent) {
  const today = new Date().toISOString().split('T')[0]
  await setVehicleDate(event.vehicleId, ['listo', 'venta'], today)
  await createTask(
    `Publicar vehículo - ${event.vehicleName}`,
    event.vehicleId,
    [],
    'Media',
    'Marketing'
  )
  await createTask(
    `Gestionar venta - ${event.vehicleName}`,
    event.vehicleId,
    [],
    'Alta',
    'Ventas'
  )
}
