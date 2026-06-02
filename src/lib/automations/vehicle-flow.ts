import { StateChangeEvent } from '@/lib/types'
import { createWorkshopOrder } from '@/lib/notion/workshop'
import { createTask } from '@/lib/notion/tasks'
import { getEmployeeByRole } from '@/lib/notion/employees'

export async function handleVehicleStateChange(event: StateChangeEvent): Promise<void> {
  switch (event.newState) {
    case 'Logistica':
      await handleLogistica(event)
      break
    case 'Taller':
      await handleTaller(event)
      break
    case 'Chapa':
      await handleChapa(event)
      break
    case 'Preparacion':
      await handlePreparacion(event)
      break
    case 'Listo':
      await handleListo(event)
      break
  }
}

async function handleLogistica(event: StateChangeEvent) {
  const logistico = await getEmployeeByRole('Logística')
  await createWorkshopOrder('Logistica', event.vehicleId, logistico?.id || null, 'Recogida/traslado del vehículo')
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
    `Preparar vehículo - ${event.vehicleName}`,
    event.vehicleId,
    preparador ? [preparador.id] : [],
    'Alta',
    'Taller'
  )
}

async function handleListo(event: StateChangeEvent) {
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
