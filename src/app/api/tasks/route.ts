import { NextRequest, NextResponse } from 'next/server'
import { getTasks, createTask } from '@/lib/notion/tasks'
import { getEmployees } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const tasks = await getTasks()
    return NextResponse.json({ success: true, data: tasks })
  } catch (error: any) {
    console.error('Tasks GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, vehicleId, area, responsableId } = body

    if (!name || !area) {
      return NextResponse.json(
        { success: false, error: 'name and area are required' },
        { status: 400 }
      )
    }

    const ids = responsableId ? [responsableId] : []
    await createTask(name.trim(), vehicleId || null, ids, 'Media', area)

    if (responsableId) {
      const employees = await getEmployees()
      const emp = employees.find(e => e.id === responsableId)
      if (emp?.email) {
        await createNotificacion(
          `📋 Tarea asignada: ${name.trim()}`,
          null,
          [emp.email]
        ).catch(err => console.error('Notificación tarea falló:', err))
      }
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Tasks POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create task' },
      { status: 500 }
    )
  }
}
