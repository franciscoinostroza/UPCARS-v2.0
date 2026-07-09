import { NextRequest, NextResponse } from 'next/server'
import { getVentas, createVenta } from '@/lib/notion/ventas'
import { getEmployees } from '@/lib/notion/employees'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterVendedor = searchParams.get('vendedor')

    let records = await getVentas()
    const [employees, vehicles] = await Promise.all([getEmployees(), getVehicles()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))
    const vehMap = new Map(vehicles.map(v => [v.id, v.name]))

    if (filterVendedor) records = records.filter(r => r.vendedorId === filterVendedor)

    const data = records.map(r => ({
      ...r,
      vendedorNombre: r.vendedorId ? (empMap.get(r.vendedorId) || 'Desconocido') : null,
      vehiculoNombre: r.vehiculoId ? (vehMap.get(r.vehiculoId) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Ventas-admin GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.vehiculoId || !body.fechaVenta) {
      return NextResponse.json({ success: false, error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const vehRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/vehicles?list=true`)
    const vehJson = await vehRes.json()
    const veh = (vehJson.data || []).find((v: any) => v.id === body.vehiculoId)
    const nombre = `VENTA - ${veh?.matricula || veh?.name || 'Vehículo'}`

    await createVenta({
      nombre,
      vehiculoId: body.vehiculoId,
      fechaVenta: body.fechaVenta,
      precioVenta: body.precioVenta ?? null,
      vendedorId: body.vendedorId ?? null,
      clienteNombre: body.clienteNombre || '',
      clienteContacto: body.clienteContacto || '',
      formaPago: body.formaPago || '',
      financiada: body.financiada || false,
      observaciones: body.observaciones || '',
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Ventas-admin POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed' },
      { status: 500 }
    )
  }
}
