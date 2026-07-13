import { NextRequest, NextResponse } from 'next/server'
import { notionPatch } from '@/lib/notion/client'
import { getDbSchema, findPropertiesByType } from '@/lib/notion/schema'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const props: Record<string, any> = {}

    if (body.estado) props['Estado'] = { select: { name: body.estado } }
    if (body.observaciones !== undefined) props['Observaciones'] = { rich_text: [{ text: { content: body.observaciones } }] }
    if (body.costeMateriales !== undefined) props['Coste materiales (€)'] = { number: body.costeMateriales }
    if (body.costeManoObra !== undefined) props['Coste mano de obra (€)'] = { number: body.costeManoObra }

    if (Object.keys(props).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${id}`, { properties: props })
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Taller PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
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
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
