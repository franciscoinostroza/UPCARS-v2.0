import { NextRequest, NextResponse } from 'next/server'
import { updateTask, archiveTask } from '@/lib/notion/tasks'
import { getEmployees } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await archiveTask(id)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Task DELETE error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to archive task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    await updateTask(id, body)

    if (body.responsableId) {
      try {
        const employees = await getEmployees()
        const emp = employees.find(e => e.id === body.responsableId)
        if (emp?.email) {
          await createNotificacion(`📋 Tarea asignada: ${body.name || 'Tarea'}`, null, [emp.email]).catch(() => {})
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: { id, ...body } })
  } catch (error: any) {
    console.error('Task PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update task' },
      { status: 500 }
    )
  }
}
