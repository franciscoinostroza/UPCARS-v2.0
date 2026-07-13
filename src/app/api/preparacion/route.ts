import { NextRequest, NextResponse } from 'next/server'
import { getPrepRecords, createPrepRecord } from '@/lib/notion/prep-records'
import { getEmployees } from '@/lib/notion/employees'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')

    let records = await getPrepRecords()
    const [employees, vehicles] = await Promise.all([getEmployees(), getVehicles()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))
    const vehMap = new Map(vehicles.map(v => [v.id, v.name]))

    if (filterEstado) records = records.filter(r => r.estado === filterEstado)

    const data = records.map(r => ({
      ...r,
      vehiculoNombre: r.vehiculoId ? (vehMap.get(r.vehiculoId) || 'Desconocido') : null,
      preparadorNombre: r.preparadorId ? (empMap.get(r.preparadorId) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Preparación GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nombre) {
      return NextResponse.json({ success: false, error: 'nombre required' }, { status: 400 })
    }

    await createPrepRecord({
      nombre: body.nombre,
      vehiculoId: body.vehiculoId || undefined,
      estado: body.estado || 'Pendiente',
      preparadorId: body.preparadorId || undefined,
      tipoLimpieza: body.tipoLimpieza || undefined,
      fechaInicio: body.fechaInicio || undefined,
      fechaFin: body.fechaFin || undefined,
      fechaEntrega: body.fechaEntrega || undefined,
      observaciones: body.observaciones || '',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Preparación POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
