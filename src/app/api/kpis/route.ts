import { NextResponse } from 'next/server'
import { getKPIStats } from '@/lib/automations/sla-engine'
import { getSupabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { slas, compliance } = await getKPIStats()

    const { data: alerts } = await getSupabase()
      .from('alert_records')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20)

    const { count: totalEvents } = await getSupabase()
      .from('vehicle_events')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: {
        slas,
        compliance,
        activeAlerts: alerts || [],
        totalEvents: totalEvents || 0,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('KPIs error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPIs' },
      { status: 500 }
    )
  }
}
