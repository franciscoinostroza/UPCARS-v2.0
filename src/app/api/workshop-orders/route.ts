import { NextRequest, NextResponse } from 'next/server'
import { createWorkshopOrder } from '@/lib/notion/workshop'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const body = await request.json()
    const { type, vehicleId, responsibleId, notes, mecanicoId, tipoTrabajo, fechaEntrada, costeMateriales, costeManoObra } = body

    if (!type || !vehicleId) {
      return NextResponse.json(
        { success: false, error: 'type and vehicleId are required' },
        { status: 400 }
      )
    }

    const validTypes = ['Taller', 'Chapa', 'Preparacion', 'Logistica']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    await createWorkshopOrder({
      type,
      vehicleId,
      responsibleId: mecanicoId || responsibleId || null,
      notes,
      tipoTrabajo,
      mecanicoId,
      fechaEntrada,
      costeMateriales: costeMateriales != null ? Number(costeMateriales) : undefined,
      costeManoObra: costeManoObra != null ? Number(costeManoObra) : undefined,
    })

    return NextResponse.json({ success: true, data: { type, vehicleId } }, { status: 201 })
  } catch (error: any) {
    console.error('Workshop POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create workshop order' },
      { status: 500 }
    )
  }
}
