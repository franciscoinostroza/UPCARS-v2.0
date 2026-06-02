import { getSupabase } from '@/lib/supabase/client'
import { VehicleState, SLA_THRESHOLDS } from '@/lib/types'

const AREA_MAP: Record<string, string> = {
  Logistica: 'Logistica',
  Taller: 'Taller',
  Chapa: 'Chapa',
  Preparacion: 'Preparacion',
}

const db = () => getSupabase()

export async function handleSLAChange(
  vehicleId: string,
  vehicleName: string,
  oldState: VehicleState | null,
  newState: VehicleState,
  timestamp: Date
): Promise<void> {
  const area = AREA_MAP[newState]
  if (!area) return

  const threshold = SLA_THRESHOLDS[area]
  if (!threshold) return

  if (oldState) {
    const oldArea = AREA_MAP[oldState]
    if (oldArea) {
      await closeSLARecord(vehicleId, oldArea, timestamp)
    }
  }

  await db().from('sla_records').insert({
    vehicle_id: vehicleId,
    area,
    start_time: timestamp.toISOString(),
    threshold,
    met: null,
  } as never)
}

async function closeSLARecord(vehicleId: string, area: string, endTime: Date): Promise<void> {
  const { data } = await db()
    .from('sla_records')
    .select('id, start_time, threshold')
    .eq('vehicle_id', vehicleId)
    .eq('area', area)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .single()

  if (!data) return

  await db()
    .from('sla_records')
    .update({
      end_time: endTime.toISOString(),
      met: (endTime.getTime() - new Date((data as any).start_time).getTime()) / (1000 * 60 * 60) <= (data as any).threshold,
    } as never)
    .eq('id', (data as any).id)
}

export async function checkSLAs() {
  const { data: openRecords } = await db()
    .from('sla_records')
    .select('*')
    .is('end_time', null)

  const violations: any[] = []

  for (const record of (openRecords as any[]) || []) {
    const start = new Date(record.start_time)
    const now = new Date()
    const hoursElapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60)

    if (hoursElapsed > record.threshold) {
      violations.push(record)
    }
  }

  return violations
}

export async function getKPIStats() {
  const { data: records } = await db()
    .from('sla_records')
    .select('*')
    .not('end_time', 'is', null)

  const typedRecords: any[] = (records as any) || []

  if (typedRecords.length === 0) {
    return { slas: {}, compliance: {} }
  }

  const areas = ['Taller', 'Chapa', 'Preparacion', 'Logistica']
  const slas: Record<string, { avg: number; count: number }> = {}
  const compliance: Record<string, number> = {}

  for (const area of areas) {
    const areaRecords = typedRecords.filter((r: any) => r.area === area)
    if (areaRecords.length === 0) continue

    const totalHours = areaRecords.reduce(
      (sum: number, r: any) => sum + ((new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / (1000 * 60 * 60)),
      0
    )
    const met = areaRecords.filter((r: any) => r.met === true).length

    slas[area] = {
      avg: Math.round((totalHours / areaRecords.length) * 10) / 10,
      count: areaRecords.length,
    }
    compliance[area] = Math.round((met / areaRecords.length) * 100)
  }

  return { slas, compliance }
}
