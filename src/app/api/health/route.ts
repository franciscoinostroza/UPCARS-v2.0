import { NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { getSupabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  let notionStatus = 'disconnected'
  let supabaseStatus = 'disconnected'
  let vehiclesCount = 0
  let alertsCount = 0

  try {
    const vehicles = await getVehicles()
    vehiclesCount = vehicles.length
    notionStatus = 'connected'
  } catch {
    notionStatus = 'disconnected'
  }

  try {
    const { count } = await getSupabase()
      .from('vehicle_events')
      .select('*', { count: 'exact', head: true })
    supabaseStatus = 'connected'

    const { count: alertCount } = await getSupabase()
      .from('alert_records')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
    alertsCount = alertCount || 0
  } catch {
    supabaseStatus = 'disconnected'
  }

  const allOk = notionStatus === 'connected' && supabaseStatus === 'connected'

  return NextResponse.json({
    status: allOk ? 'ok' : 'degraded',
    service: 'UPCARS Automation Engine v2',
    notion: notionStatus,
    supabase: supabaseStatus,
    uptime: process.uptime(),
    vehiclesCount,
    alertsCount,
    timestamp: new Date().toISOString(),
  })
}
