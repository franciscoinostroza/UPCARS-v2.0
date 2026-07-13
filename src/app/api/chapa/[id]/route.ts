import { NextRequest, NextResponse } from 'next/server'
import { updateChapaRecord } from '@/lib/notion/chapa-records'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await updateChapaRecord(id, body)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Chapa PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
