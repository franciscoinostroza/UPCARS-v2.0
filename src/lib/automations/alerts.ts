import { supabase } from '@/lib/supabase/client'
import { checkSLAs } from './sla-engine'
import { getVehicles } from '@/lib/notion/vehicles'

export async function handleAlertCheck(): Promise<void> {
  await Promise.all([
    checkSLAAlerts(),
    checkVehicleAlerts(),
    checkTaskAlerts(),
  ])
}

async function checkSLAAlerts() {
  const violations = await checkSLAs()

  for (const violation of violations) {
    await supabase.from('alert_records').insert({
      vehicle_id: violation.vehicle_id,
      vehicle_name: violation.vehicle_id,
      type: 'sla_violation',
      message: `SLA excedido en ${violation.area} para vehículo ${violation.vehicle_id}`,
      resolved: false,
    })
  }
}

async function checkVehicleAlerts() {
  const vehicles = await getVehicles()
  const now = new Date()

  for (const v of vehicles) {
    if (!v.responsable && v.state !== 'Vendido') {
      await createVehicleAlert(v.id, v.name, 'vehicle_no_responsible', `Vehículo sin responsable asignado`)
    }

    if (v.state === 'Chapa') {
      const fechaCompra = v.fechaCompra ? new Date(v.fechaCompra) : null
      if (fechaCompra && (now.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24) > 7) {
        await createVehicleAlert(v.id, v.name, 'chapa_prolonged', `Vehículo en chapa/pintura por más de 7 días`)
      }
    }

    if (v.state === 'Comprado' && v.fechaCompra) {
      const fechaCompra = new Date(v.fechaCompra)
      if ((now.getTime() - fechaCompra.getTime()) / (1000 * 60 * 60 * 24) > 7) {
        await createVehicleAlert(v.id, v.name, 'stuck_in_comprado', `Vehículo detenido en estado Comprado por más de 7 días`)
      }
    }
  }
}

async function checkTaskAlerts() {
  try {
    const dbId = process.env.TASKS_DB_ID
    if (!dbId) return

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: 'Estado',
          status: { does_not_equal: 'Completada' },
        },
      }),
    })

    if (!res.ok) return
    const data: any = await res.json()
    const now = new Date()

    for (const task of data.results || []) {
      const deadline = task.properties?.['Fecha límite']?.date?.start
      if (!deadline) continue

      const dueDate = new Date(deadline)
      if (dueDate < now) {
        const taskName = task.properties?.['Nombre de la tarea']?.title?.[0]?.plain_text || 'Tarea'
        await supabase.from('alert_records').insert({
          vehicle_id: null,
          vehicle_name: taskName,
          type: 'task_overdue',
          message: `Tarea vencida: ${taskName}`,
          resolved: false,
        })
      }
    }
  } catch {
    // Silently fail on task alerts
  }
}

async function createVehicleAlert(vehicleId: string, vehicleName: string, type: string, message: string) {
  const { data: existing } = await supabase
    .from('alert_records')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('type', type)
    .eq('resolved', false)
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('alert_records').insert({
    vehicle_id: vehicleId,
    vehicle_name: vehicleName,
    type,
    message,
    resolved: false,
  })
}
