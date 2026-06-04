import { NextRequest, NextResponse } from 'next/server'
import { createTask } from '@/lib/notion/tasks'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, vehicleId, area } = body

    if (!name || !area) {
      return NextResponse.json(
        { success: false, error: 'name and area are required' },
        { status: 400 }
      )
    }

    await createTask(name.trim(), vehicleId || null, [], 'Media', area)

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Tasks POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create task' },
      { status: 500 }
    )
  }
}
