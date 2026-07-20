import { NextRequest, NextResponse } from 'next/server'
import { createNotificacion } from '@/lib/notion/notifications'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

const LABELS: Record<string, string> = {
  taller: '🔧 Taller',
  chapa: '🔩 Chapa',
  preparacion: '🧹 Preparación',
  logistica: '📦 Logística',
  ventas: '💰 Ventas',
  tareas: '📋 Tarea',
  vehiculos: '🚗 Vehículo',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recordName, responsableId, autorNombre, extra } = body

    if (!type || !responsableId) {
      return NextResponse.json({ success: false, error: 'type and responsableId required' }, { status: 400 })
    }

    const label = LABELS[type] || type
    const employees = await getEmployees()
    const emp = employees.find(e => e.id === responsableId)

    if (!emp?.email) {
      return NextResponse.json({ success: true, message: 'Employee has no email, skipped notification' })
    }

    const title = `${label} — ${recordName || 'Sin nombre'}`
    const link = body.link || null

    await createNotificacion(title, link, [emp.email], autorNombre || 'Sistema')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Notify error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
