import { NextRequest, NextResponse } from 'next/server'
import { updateTask, archiveTask } from '@/lib/notion/tasks'

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

    return NextResponse.json({ success: true, data: { id, ...body } })
  } catch (error: any) {
    console.error('Task PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update task' },
      { status: 500 }
    )
  }
}
