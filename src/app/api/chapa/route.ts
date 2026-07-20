import { NextRequest, NextResponse } from 'next/server'
import { getChapaRecords, createChapaRecord } from '@/lib/notion/chapa-records'
import { getEmployees } from '@/lib/notion/employees'
import { getVehicles } from '@/lib/notion/vehicles'
import { getProviders } from '@/lib/notion/providers'
import { notionGet } from '@/lib/notion/client'
import { parseVehicleProps } from '@/lib/notion/props'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')

    let records = await getChapaRecords()
    const [employees, vehicles, providers] = await Promise.all([getEmployees(), getVehicles(), getProviders()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))
    const vehMap = new Map(vehicles.map(v => [v.id, v.name]))
    const provMap = new Map(providers.map((p: any) => [p.id, p.name]))

    if (filterEstado) records = records.filter(r => r.estado === filterEstado)

    const data = records.map(r => ({
      ...r,
      vehiculoNombre: r.vehiculoId ? (vehMap.get(r.vehiculoId) || 'Desconocido') : null,
      proveedorNombre: r.proveedorId ? (provMap.get(r.proveedorId) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Chapa GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.vehiculoId) {
      return NextResponse.json({ success: false, error: 'vehiculoId required' }, { status: 400 })
    }
    const vehPage: any = await notionGet(`/pages/${body.vehiculoId}`)
    const matricula = parseVehicleProps(body.vehiculoId, vehPage.properties).matricula || 'CHAPA'

    await createChapaRecord({
      matricula,
      vehiculoId: body.vehiculoId,
      estado: body.estado,
      proveedorId: body.proveedorId || null,
      costeTotal: body.costeTotal ?? null,
      fechaSalida: body.fechaSalida || null,
      fechaRetorno: body.fechaRetorno || null,
      trabajosSolicitados: body.trabajosSolicitados || '',
      observaciones: body.observaciones || '',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Chapa POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
