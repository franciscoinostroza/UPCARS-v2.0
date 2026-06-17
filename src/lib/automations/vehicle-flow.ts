import { StateChangeEvent, WorkshopArea } from '@/lib/types'
import { createWorkshopOrder } from '@/lib/notion/workshop'
import { createTask } from '@/lib/notion/tasks'
import { getEmployeeByRole } from '@/lib/notion/employees'
import { setVehicleDate } from '@/lib/notion/vehicles'
import { createCalendarEvent } from '@/lib/notion/calendar'
import { createChapaRecord } from '@/lib/notion/chapa'

const STATE_TO_AREA: Record<string, WorkshopArea> = {
  'En logística': 'Logistica',
  'En taller': 'Taller',
  'En chapa': 'Chapa',
  'En preparación': 'Preparacion',
  'Entregado al concesionario': 'Preparacion',
}

const STATE_TO_DEPT: Record<string, string> = {
  'En logística': 'Logística',
  'En taller': 'Taller',
  'En chapa': 'Taller',
  'En preparación': 'Taller',
  'Entregado al concesionario': 'Taller',
}

export async function handleVehicleStateChange(event: StateChangeEvent): Promise<void> {
  switch (event.newState) {
    case 'En logística':
      await handleLogistica(event)
      break
    case 'En taller':
      await handleTaller(event)
      break
    case 'En chapa':
      await handleChapa(event)
      break
    case 'Entregado al concesionario':
      await handleEntregaConcesionario(event)
      break
    case 'En preparación':
      await handlePreparacion(event)
      break
    case 'Listo para venta':
      await handleListo(event)
      break
  }
}

async function handleLogistica(event: StateChangeEvent) {
  const logistico = await getEmployeeByRole('Logística')
  const today = new Date().toISOString().split('T')[0]

  await createCalendarEvent(event.vehicleName, logistico?.id || null, today)
  await createWorkshopOrder(STATE_TO_AREA['En logística'], event.vehicleId, logistico?.id || null, 'Recogida/traslado del vehículo')
  await createTask(
    `Organizar logística - ${event.vehicleName}`,
    event.vehicleId,
    logistico ? [logistico.id] : [],
    'Alta',
    'Logística'
  )
}

async function handleTaller(event: StateChangeEvent) {
  const mecanico = await getEmployeeByRole('Mecánico')
  await createWorkshopOrder(STATE_TO_AREA['En taller'], event.vehicleId, mecanico?.id || null, 'Revisión mecánica general')
  await createTask(
    `Revisión mecánica - ${event.vehicleName}`,
    event.vehicleId,
    mecanico ? [mecanico.id] : [],
    'Alta',
    STATE_TO_DEPT['En taller']
  )
}

async function handleEntregaConcesionario(event: StateChangeEvent) {
  const today = new Date().toISOString().split('T')[0]
  await setVehicleDate(event.vehicleId, ['entrada', 'preparación'], today)
  await createWorkshopOrder('Preparacion', event.vehicleId, null, 'Vehículo recibido en concesionario - Pendiente limpieza')
  await createTask(
    `Recibir y preparar - ${event.vehicleName}`,
    event.vehicleId,
    [],
    'Alta',
    STATE_TO_DEPT['Entregado al concesionario']
  )
}

async function handleChapa(event: StateChangeEvent) {
  await createChapaRecord(event.vehicleId, event.vehicleName, undefined, 'Salida a proveedor externo para chapa y pintura')
  await createTask(
    `Gestionar chapa y pintura - ${event.vehicleName}`,
    event.vehicleId,
    [],
    'Alta',
    STATE_TO_DEPT['En chapa']
  )
}

async function handlePreparacion(event: StateChangeEvent) {
  const preparador = await getEmployeeByRole('Preparador')
  await createWorkshopOrder(STATE_TO_AREA['En preparación'], event.vehicleId, preparador?.id || null, 'Preparación y limpieza')
  await createTask(
    `Checklist limpieza - ${event.vehicleName}`,
    event.vehicleId,
    preparador ? [preparador.id] : [],
    'Alta',
    STATE_TO_DEPT['En preparación']
  )
  await createTask(
    `Preparar vehículo - ${event.vehicleName}`,
    event.vehicleId,
    preparador ? [preparador.id] : [],
    'Alta',
    STATE_TO_DEPT['En preparación']
  )
}

async function handleListo(event: StateChangeEvent) {
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
