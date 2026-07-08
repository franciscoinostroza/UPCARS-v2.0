import { NextRequest, NextResponse } from 'next/server'
import { updateLogisticaRecord } from '@/lib/notion/logistica'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    await updateLogisticaRecord(id, body)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Logística PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update' },
      { status: 500 }
    )
  }
}
