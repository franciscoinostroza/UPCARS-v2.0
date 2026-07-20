import { NextRequest, NextResponse } from 'next/server'
import { updateTasacion } from '@/lib/notion/tasaciones'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await updateTasacion(id, body)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Tasaciones PATCH error:', error)
    console.error('tasaciones DELETE error:', error);
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
    console.error('tasaciones DELETE error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
