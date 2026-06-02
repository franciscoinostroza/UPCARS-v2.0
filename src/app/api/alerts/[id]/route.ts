import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await getSupabase()
      .from('alert_records')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: { id, resolved: true } })
  } catch (error: any) {
    console.error('Alert PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to resolve alert' },
      { status: 500 }
    )
  }
}
