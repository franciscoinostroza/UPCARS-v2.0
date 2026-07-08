import { NextRequest, NextResponse } from 'next/server'
import { getLogisticaRecords, createLogisticaRecord } from '@/lib/notion/logistica'
import { getEmployees } from '@/lib/notion/employees'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')
    const filterVehiculo = searchParams.get('vehiculo')

    let records = await getLogisticaRecords()
    const [employees, vehicles] = await Promise.all([getEmployees(), getVehicles()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))
    const vehMap = new Map(vehicles.map(v => [v.id, v.name]))

    if (filterEstado) records = records.filter(r => r.estado === filterEstado)
    if (filterVehiculo) records = records.filter(r => r.vehiculoId === filterVehiculo)

    const data = records.map(r => ({
      ...r,
      responsableNombre: r.responsableId ? (empMap.get(r.responsableId) || 'Desconocido') : null,
      vehiculoNombre: r.vehiculoId ? (vehMap.get(r.vehiculoId) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Logística GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch logistica' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, vehiculoId, responsableId, estado, fechaProgramada, ubicacion, situacionComercial, prioridad, observaciones } = body

    if (!nombre) {
      return NextResponse.json({ success: false, error: 'nombre is required' }, { status: 400 })
    }

    await createLogisticaRecord({
      nombre: nombre.trim(),
      vehiculoId: vehiculoId || undefined,
      responsableId: responsableId || undefined,
      estado,
      fechaProgramada: fechaProgramada || undefined,
      ubicacion: ubicacion?.trim(),
      situacionComercial: situacionComercial || undefined,
      prioridad: prioridad || undefined,
      observaciones: observaciones?.trim(),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Logística POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create' },
      { status: 500 }
    )
  }
}
