import { NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { createFinanzaRecord, getFinanzasByVehicle } from '@/lib/notion/finanzas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const vehicles = await getVehicles()
    const results = { creados: 0, saltados: 0, errores: 0 }

    for (const v of vehicles) {
      const existing = await getFinanzasByVehicle(v.id)

      if (existing.length > 0) {
        results.saltados++
        continue
      }

      if (v.situacion === 'Vendido') {
        const margen = (v.margenBruto ?? 0)
        if (margen !== 0) {
          try {
            await createFinanzaRecord({
              concepto: v.name,
              tipo: margen > 0 ? 'Ingreso' : 'Egreso',
              categoria: 'Venta',
              importe: Math.abs(margen),
              fecha: v.fechaVendido || new Date().toISOString().split('T')[0],
              vehiculoId: v.id,
              notas: `Compra: ${v.precioCompra ?? '?'}€ · Venta: ${v.precioVenta ?? '?'}€ · Margen: ${margen}€`,
            })
            results.creados++
          } catch {
            results.errores++
          }
        } else {
          results.saltados++
        }
      } else {
        results.saltados++
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error: any) {
    console.error('Migrate finanzas error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Migration failed' },
      { status: 500 }
    )
  }
}
