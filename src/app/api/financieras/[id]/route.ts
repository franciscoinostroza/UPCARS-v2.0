import { NextRequest, NextResponse } from 'next/server'
import { updateFinanciera } from '@/lib/notion/financieras'
import { notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await updateFinanciera(id, body)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Financieras PATCH error:', error)
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
    console.error('Financieras DELETE error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
