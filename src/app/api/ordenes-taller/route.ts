import { NextRequest, NextResponse } from 'next/server'
import { getWorkshopOrders } from '@/lib/notion/workshop'
import { getEmployees } from '@/lib/notion/employees'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

const TYPE_PREFIXES: Record<string, string> = { taller: 'OT', chapa: 'CHAPA', preparacion: 'PREP' }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')
    const filterType = searchParams.get('type')
    const prefix = filterType ? TYPE_PREFIXES[filterType] : null

    let records = await getWorkshopOrders()
    const [employees, vehicles] = await Promise.all([getEmployees(), getVehicles()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))
    const vehMap = new Map(vehicles.map(v => [v.id, v.name]))

    if (prefix) records = records.filter(r => r.nombre.startsWith(prefix))
    if (filterEstado) records = records.filter(r => r.estado === filterEstado)

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Taller GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
