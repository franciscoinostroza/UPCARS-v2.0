import { NextRequest, NextResponse } from 'next/server'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const props: Record<string, any> = {}

    if (body.precioCompra !== undefined) props['Precio de compra (€)'] = { number: body.precioCompra }
    if (body.precioVenta !== undefined) props['Precio venta (€)'] = { number: body.precioVenta }
    if (body.color !== undefined) props['Color'] = { rich_text: [{ text: { content: body.color } }] }
    if (body.kilometrajeEntrada !== undefined) props['Kilometraje entrada'] = { number: body.kilometrajeEntrada }
    if (body.notas !== undefined) props['Notas'] = { rich_text: [{ text: { content: body.notas } }] }

    if (Object.keys(props).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${id}`, { properties: props })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Vehículos PATCH error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await notionPatch(`/pages/${id}`, { archived: true })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Vehículos DELETE error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
