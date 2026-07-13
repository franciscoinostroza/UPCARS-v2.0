import { NextRequest, NextResponse } from 'next/server'
import { createWorkshopOrder } from '@/lib/notion/workshop'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.vehicleId || !body.type) {
      return NextResponse.json({ success: false, error: 'vehicleId and type required' }, { status: 400 })
    }
    await createWorkshopOrder({
      type: body.type,
      vehicleId: body.vehicleId,
      responsibleId: body.responsibleId || body.mecanicoId || null,
      notes: body.notes,
      tipoTrabajo: body.tipoTrabajo,
      mecanicoId: body.mecanicoId || null,
      fechaEntrada: body.fechaEntrada,
      costeMateriales: body.costeMateriales,
      costeManoObra: body.costeManoObra,
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
