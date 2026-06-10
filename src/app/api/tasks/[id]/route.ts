import { NextRequest, NextResponse } from 'next/server'
import { updateTaskStatus, archiveTask } from '@/lib/notion/tasks'

export const dynamic = 'force-dynamic'

const VALID_STATES = ['Sin empezar', 'En progreso', 'Bloqueada', 'Completada', 'Cancelada']

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
    const { state } = body

    if (!state || !VALID_STATES.includes(state)) {
      return NextResponse.json(
        { success: false, error: `state must be one of: ${VALID_STATES.join(', ')}` },
        { status: 400 }
      )
    }

    await updateTaskStatus(id, state)

    return NextResponse.json({ success: true, data: { id, state } })
  } catch (error: any) {
    console.error('Task PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update task' },
      { status: 500 }
    )
  }
}
