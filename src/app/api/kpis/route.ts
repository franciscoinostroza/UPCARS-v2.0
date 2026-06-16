import { NextResponse } from 'next/server'
import { getKPIStats, getBottlenecks, getVehicleKPIs } from '@/lib/automations/sla-engine'
import { getEmployeeKPIs } from '@/lib/automations/employee-kpis'
import { getVehicles } from '@/lib/notion/vehicles'
import { getSupabase } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null)
  return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

async function getVehicleCycleTimes() {
  const { data: events } = await getSupabase()
    .from('vehicle_events')
    .select('vehicle_id, vehicle_name, new_state, created_at')
    .order('created_at', { ascending: true })

  if (!events || (events as any[]).length === 0) return {}

  const byVehicle: Record<string, { start?: string; end?: string; name: string }> = {}

  for (const e of events as any[]) {
    if (!byVehicle[e.vehicle_id]) {
      byVehicle[e.vehicle_id] = { name: e.vehicle_name }
    }
    if (e.new_state === 'Comprado' && !byVehicle[e.vehicle_id].start) {
      byVehicle[e.vehicle_id].start = e.created_at
    }
    if (e.new_state === 'Listo para venta' || e.new_state === 'Vendido') {
      byVehicle[e.vehicle_id].end = e.created_at
    }
  }

  const result: Record<string, { vehicleName: string; totalDays: number | null; startDate: string | null; endDate: string | null }> = {}

  for (const [vid, data] of Object.entries(byVehicle)) {
    if (data.start) {
      const start = new Date(data.start)
      const end = data.end ? new Date(data.end) : new Date()
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) * 10) / 10
      result[vid] = {
        vehicleName: data.name,
        totalDays,
        startDate: data.start,
        endDate: data.end || null,
      }
    }
  }

  return result
}

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

    const vehicleCycles = await getVehicleCycleTimes()
    const bottlenecks = await getBottlenecks()
    const vehicleKPIs = await getVehicleKPIs()
    const employeeKPIs = await getEmployeeKPIs()

    const allVehicles = await getVehicles()
    const sold = allVehicles.filter(v => v.state === 'Vendido')
    const soldWithDate = sold.filter(v => v.fechaVendido)

    const sales = {
      totalSold: sold.length,
      avgSalePrice: avg(sold.map(v => v.precioVenta)),
      avgMargin: avg(sold.map(v => v.margenBruto)),
      totalRevenue: sold.reduce((s, v) => s + (v.precioVenta ?? 0), 0),
      totalMargin: sold.reduce((s, v) => s + (v.margenBruto ?? 0), 0),
      avgDaysToSell: avg(soldWithDate.map(v =>
        v.fechaCompra ? daysBetween(v.fechaCompra, v.fechaVendido!) : null
      )),
      byMonth: Object.entries(
        soldWithDate.reduce((acc: Record<string, { count: number; revenue: number; margin: number }>, v) => {
          if (!v.fechaVendido) return acc
          const m = v.fechaVendido.slice(0, 7)
          if (!acc[m]) acc[m] = { count: 0, revenue: 0, margin: 0 }
          acc[m].count++
          acc[m].revenue += v.precioVenta ?? 0
          acc[m].margin += v.margenBruto ?? 0
          return acc
        }, {})
      ).map(([month, d]) => ({ month, ...d })).sort((a, b) => a.month.localeCompare(b.month)),
    }

    return NextResponse.json({
      success: true,
      data: {
        slas,
        compliance,
        bottlenecks,
        vehicleKPIs,
        employeeKPIs,
        sales,
        activeAlerts: alerts || [],
        totalEvents: totalEvents || 0,
        vehicleCycles,
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
