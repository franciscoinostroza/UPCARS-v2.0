import { NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const vehicles = await getVehicles()
    const activeStates = ['Comprado', 'Logistica', 'Taller', 'Chapa', 'Preparacion', 'Listo']
    const activeVehicles = vehicles.filter((v) => activeStates.includes(v.state))

    const pipeline = activeStates.map((state) => ({
      state,
      vehicles: activeVehicles
        .filter((v) => v.state === state)
        .map((v) => ({
          id: v.id,
          name: v.name,
          matricula: v.matricula,
          brand: v.brand,
          model: v.model,
          year: v.year,
          daysInState: v.fechaCompra
            ? Math.floor(
                (Date.now() - new Date(v.fechaCompra).getTime()) / (1000 * 60 * 60 * 24)
              )
            : 0,
        })),
    }))

    return NextResponse.json({ success: true, data: { pipeline, total: activeVehicles.length } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}
