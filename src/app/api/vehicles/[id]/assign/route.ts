import { NextRequest, NextResponse } from 'next/server'
import { assignResponsable, getVehicle } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { employeeId } = body

    const vehicle = await getVehicle(id)
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    await assignResponsable(id, employeeId || null)

    return NextResponse.json({ success: true, data: { id, responsable: employeeId } })
  } catch (error: any) {
    console.error('Assign PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to assign responsable' },
      { status: 500 }
    )
  }
}
