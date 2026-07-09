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

    if (body.precioVenta !== undefined) props['Precio de venta (€)'] = { number: body.precioVenta }
    if (body.clienteNombre !== undefined) props['Cliente nombre'] = { rich_text: [{ text: { content: body.clienteNombre } }] }
    if (body.clienteContacto !== undefined) props['Cliente contacto'] = { rich_text: [{ text: { content: body.clienteContacto } }] }
    if (body.formaPago !== undefined) props['Forma de pago'] = { select: { name: body.formaPago } }
    if (body.financiada !== undefined) props['Financiada'] = { checkbox: body.financiada }
    if (body.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: body.observaciones } }] }

    if (Object.keys(props).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${id}`, { properties: props })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Ventas-admin PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
