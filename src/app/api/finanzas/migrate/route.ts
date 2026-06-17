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

      const compraExiste = existing.some(r => r.tipo === 'Egreso' && r.categoria === 'Compra')
      if (v.precioCompra && !compraExiste) {
        try {
          await createFinanzaRecord({
            concepto: `Compra - ${v.name}`,
            tipo: 'Egreso',
            categoria: 'Compra',
            importe: v.precioCompra,
            fecha: v.fechaCompra || new Date().toISOString().split('T')[0],
            vehiculoId: v.id,
          })
          results.creados++
        } catch {
          results.errores++
        }
      } else {
        results.saltados++
      }

      const ventaExiste = existing.some(r => r.tipo === 'Ingreso' && r.categoria === 'Venta')
      if (v.state === 'Vendido' && v.precioVenta && !ventaExiste) {
        try {
          await createFinanzaRecord({
            concepto: `Venta - ${v.name}`,
            tipo: 'Ingreso',
            categoria: 'Venta',
            importe: v.precioVenta,
            fecha: v.fechaVendido || new Date().toISOString().split('T')[0],
            vehiculoId: v.id,
          })
          results.creados++
        } catch {
          results.errores++
        }
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
