import { NextRequest, NextResponse } from 'next/server'
import { getVentas, createVenta } from '@/lib/notion/ventas'
import { getVehicles } from '@/lib/notion/vehicles'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

function avg(nums: (number | null)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null)
  return valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  try {
    const [ventas, vehicles, employees] = await Promise.all([
      getVentas(),
      getVehicles(),
      getEmployees(),
    ])

    const sold = vehicles.filter(v => v.situacion === 'Vendido')
    const soldWithDate = sold.filter(v => v.fechaVendido)

    const salesKpis = {
      totalSold: sold.length,
      totalSoldWithDate: soldWithDate.length,
      avgSalePrice: avg(sold.map(v => v.precioVenta)),
      avgPurchasePrice: avg(sold.map(v => v.precioCompra)),
      avgMargin: avg(sold.map(v => v.margenBruto)),
      avgDaysToSell: avg(soldWithDate.map(v =>
        v.fechaCompra && v.fechaVendido ? daysBetween(v.fechaCompra, v.fechaVendido) : null
      )),
      avgDaysOnMarket: avg(soldWithDate.map(v =>
        v.fechaListo && v.fechaVendido ? daysBetween(v.fechaListo, v.fechaVendido) : null
      )),
      totalRevenue: sold.reduce((sum, v) => sum + (v.precioVenta ?? 0), 0),
      totalMargin: sold.reduce((sum, v) => sum + (v.margenBruto ?? 0), 0),
    }

    const byMonth: Record<string, { count: number; revenue: number; margin: number }> = {}
    for (const v of soldWithDate) {
      if (!v.fechaVendido) continue
      const month = v.fechaVendido.slice(0, 7)
      if (!byMonth[month]) byMonth[month] = { count: 0, revenue: 0, margin: 0 }
      byMonth[month].count++
      byMonth[month].revenue += v.precioVenta ?? 0
      byMonth[month].margin += v.margenBruto ?? 0
    }

    const empMap = new Map(employees.map(e => [e.id, e]))
    const byEmployee: Record<string, { name: string; count: number; revenue: number; margin: number }> = {}
    for (const v of sold) {
      if (!v.responsable) continue
      if (!byEmployee[v.responsable]) {
        byEmployee[v.responsable] = {
          name: empMap.get(v.responsable)?.name ?? 'Desconocido',
          count: 0, revenue: 0, margin: 0,
        }
      }
      byEmployee[v.responsable].count++
      byEmployee[v.responsable].revenue += v.precioVenta ?? 0
      byEmployee[v.responsable].margin += v.margenBruto ?? 0
    }

    return NextResponse.json({
      success: true,
      data: {
        ventas,
        salesKpis,
        byMonth: Object.entries(byMonth)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        byEmployee: Object.entries(byEmployee).map(([id, data]) => ({ id, ...data })),
      },
    })
  } catch (error: any) {
    console.error('Ventas GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch ventas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, vehiculoId, fechaVenta, precioVenta, vendedorId, clienteNombre, clienteContacto, formaPago, financiada, financieraId, observaciones } = body

    if (!nombre || !vehiculoId || !fechaVenta) {
      return NextResponse.json(
        { success: false, error: 'nombre, vehiculoId and fechaVenta are required' },
        { status: 400 }
      )
    }

    await createVenta({
      nombre,
      vehiculoId,
      fechaVenta,
      precioVenta: precioVenta ?? null,
      vendedorId: vendedorId ?? null,
      clienteNombre,
      clienteContacto,
      formaPago,
      financiada,
      financieraId: financieraId ?? null,
      observaciones,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Ventas POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create venta' },
      { status: 500 }
    )
  }
}
