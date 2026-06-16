import { getSupabase } from '@/lib/supabase/client'
import { checkSLAs } from './sla-engine'
import { getVehicles } from '@/lib/notion/vehicles'
import { STUCK_THRESHOLDS } from '@/lib/types'
import type { VehicleState } from '@/lib/types'
import { sendEmail } from '@/lib/email/send'
import { notionPost, getDatabaseId } from '@/lib/notion/client'
import { getDbSchema, findPropertiesByType } from '@/lib/notion/schema'
import { getEmployees, getEmployeesByNames, getEmployeeByRole } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''
const ALERT_STAFF = ['José', 'Luis Miguel', 'David']

export async function handleAlertCheck(): Promise<void> {
  await Promise.all([
    checkSLAAlerts(),
    checkVehicleAlerts(),
    checkTaskAlerts(),
  ])
}

async function checkSLAAlerts() {
  const violations = await checkSLAs()
  const allVehicles = await getVehicles()
  const staff = await getEmployeesByNames(ALERT_STAFF)
  const staffEmails = staff.map(e => e.email).filter(Boolean)

  for (const violation of violations) {
    await getSupabase().from('alert_records').insert({
      vehicle_id: violation.vehicle_id,
      vehicle_name: violation.vehicle_id,
      type: 'sla_violation',
      message: `SLA excedido en ${violation.area} para vehículo ${violation.vehicle_id}`,
      resolved: false,
    } as never)

    const v = allVehicles.find(ve => ve.id === violation.vehicle_id)
    const emails = [...staffEmails]
    if (violation.area === 'Logistica') {
      const e = await getEmployeeByRole('Logística')
      if (e?.email && !emails.includes(e.email)) emails.push(e.email)
    } else if (violation.area === 'Taller') {
      const e = await getEmployeeByRole('Mecánico')
      if (e?.email && !emails.includes(e.email)) emails.push(e.email)
    } else if (violation.area === 'Chapa') {
      const chapa = await getEmployeesByNames(['Luis Miguel', 'Víctor', 'José'])
      chapa.forEach(e => { if (e.email && !emails.includes(e.email)) emails.push(e.email) })
    } else if (violation.area === 'Preparacion') {
      const e = await getEmployeeByRole('Preparador')
      if (e?.email && !emails.includes(e.email)) emails.push(e.email)
    }

    if (emails.length > 0) {
      await createNotificacion(
        `⏰ SLA excedido en ${violation.area}${v ? ` - ${v.name}` : ''}`,
        null,
        emails
      ).catch(err => console.error('Notificación SLA falló:', err))
    }
  }
}

async function checkVehicleAlerts() {
  const vehicles = await getVehicles()
  const now = new Date()

  for (const v of vehicles) {
    if (!v.responsable && v.state !== 'Vendido') {
      await createVehicleAlert(v.id, v.name, 'vehicle_no_responsible', `${v.name} sin responsable asignado`)
    }

    const threshold = STUCK_THRESHOLDS[v.state as VehicleState]
    if (threshold && v.fechaCompra) {
      const refDate = new Date(v.fechaCompra)
      if ((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24) > threshold) {
        const stateKey = v.state.toLowerCase().replace(/\s+/g, '_')
        await createVehicleAlert(
          v.id, v.name,
          `stuck_in_${stateKey}`,
          `${v.name} detenido en ${v.state} por más de ${threshold} días`
        )
      }
    }
  }
}

async function checkTaskAlerts() {
  try {
    const dbId = getDatabaseId('tasks')
    const schema = await getDbSchema('tasks')

    const selects = findPropertiesByType(schema, 'select')
    const dates = findPropertiesByType(schema, 'date')

    const estadoKey = selects.find((s) => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'
    const fechaKey = dates.find((d) => d.name === 'Fecha límite' || d.name.includes('Fecha'))?.name || dates[0]?.name || 'Fecha límite'
    const titleKey = 'Nombre de la tarea'

    const data: any = await notionPost(`/databases/${dbId}/query`, {
      filter: {
        property: estadoKey,
        select: { does_not_equal: 'Completada' },
      },
    })

    const now = new Date()

    const allEmployees = await getEmployees()

    for (const task of data.results || []) {
      const deadline = task.properties?.[fechaKey]?.date?.start
      if (!deadline) continue

      const dueDate = new Date(deadline)
      if (dueDate < now) {
        const taskName = task.properties?.[titleKey]?.title?.[0]?.plain_text || 'Tarea'
        await getSupabase().from('alert_records').insert({
          vehicle_id: null,
          vehicle_name: taskName,
          type: 'task_overdue',
          message: `Tarea vencida: ${taskName}`,
          resolved: false,
        } as never)

        const responsableIds: string[] = task.properties?.Responsable?.relation?.map((r: any) => r.id) || []
        if (responsableIds.length > 0) {
          const taskEmails = responsableIds
            .map((id: string) => allEmployees.find(e => e.id === id))
            .filter((e: any): e is any => e?.email)
            .map((e: any) => e.email)
          if (taskEmails.length > 0) {
            await createNotificacion(
              `⏰ Tarea vencida: ${taskName}`,
              null,
              taskEmails
            ).catch(err => console.error('Notificación tarea vencida falló:', err))
          }
        }
      }
    }
  } catch (error) {
    console.error('checkTaskAlerts error:', error)
  }
}

async function createVehicleAlert(vehicleId: string, vehicleName: string, type: string, message: string) {
  const { data: existing } = await getSupabase()
    .from('alert_records')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('type', type)
    .eq('resolved', false)
    .limit(1)

  if (existing && existing.length > 0) return

  await getSupabase().from('alert_records').insert({
    vehicle_id: vehicleId,
    vehicle_name: vehicleName,
    type,
    message,
    resolved: false,
  } as never)

  if (ADMIN_EMAIL) {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `⚠️ UPCARS Alerta: ${message}`,
      html: `<p><strong>${message}</strong></p>
<p>Vehículo: ${vehicleName}</p>
<p>Tipo: ${type}</p>
<p>Fecha: ${new Date().toLocaleString('es-ES')}</p>`,
    })
  }

  const staff = await getEmployeesByNames(ALERT_STAFF)
  const emails = staff.map(e => e.email).filter(Boolean)
  if (emails.length > 0) {
    await createNotificacion(
      `⚠️ ${message}`,
      null,
      emails
    ).catch(err => console.error('Notificación alerta falló:', err))
  }
}
