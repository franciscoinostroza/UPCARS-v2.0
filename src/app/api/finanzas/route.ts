import { NextResponse } from 'next/server'
import { getFinanzas, computeFinanzasKPIs } from '@/lib/notion/finanzas'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  try {
    const [records, vehicles] = await Promise.all([
      getFinanzas(),
      getVehicles(),
    ])

    const sold = vehicles.filter(v => v.state === 'Vendido')
    const totalRevenue = sold.reduce((s, v) => s + (v.precioVenta ?? 0), 0)
    const totalMargin = sold.reduce((s, v) => s + (v.margenBruto ?? 0), 0)

    const kpis = computeFinanzasKPIs(records, totalRevenue, totalMargin)

    const margenPositivo = sold.filter(v => (v.margenBruto ?? 0) > 0).reduce((s, v) => s + (v.margenBruto ?? 0), 0)
    const margenNegativo = Math.abs(sold.filter(v => (v.margenBruto ?? 0) < 0).reduce((s, v) => s + (v.margenBruto ?? 0), 0))
    const ventasConMargen = sold.filter(v => v.margenBruto != null)

    const margenPorVehiculo = ventasConMargen
      .map(v => ({
        name: v.name,
        margen: v.margenBruto!,
        precioCompra: v.precioCompra,
        precioVenta: v.precioVenta,
        fechaVenta: v.fechaVendido,
        dias: v.fechaCompra && v.fechaVendido ? daysBetween(v.fechaCompra, v.fechaVendido) : null,
      }))
      .sort((a, b) => b.margen - a.margen)

    return NextResponse.json({
      success: true,
      data: {
        records,
        kpis,
        margenResumen: {
          positivo: margenPositivo,
          negativo: margenNegativo,
          balance: margenPositivo - margenNegativo,
          totalVehicles: sold.length,
        },
        margenPorVehiculo,
        porMes: kpis.porMes,
      },
    })
  } catch (error: any) {
    console.error('Finanzas GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch finanzas' },
      { status: 500 }
    )
  }
}
