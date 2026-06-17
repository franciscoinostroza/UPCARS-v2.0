import { NextResponse } from 'next/server'
import { getFinanzas, computeFinanzasKPIs } from '@/lib/notion/finanzas'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

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

    return NextResponse.json({
      success: true,
      data: {
        records,
        kpis,
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
