import { NextRequest, NextResponse } from 'next/server'
import { getVehicles, createVehicle } from '@/lib/notion/vehicles'
import { SLA_THRESHOLDS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const SLA_MAP: Record<string, string> = {
  'En logística': 'Logistica',
  'En taller': 'Taller',
  'En chapa': 'Chapa',
  'En preparación': 'Preparacion',
}

const COMPRADO_THRESHOLD_HOURS = 168

function calcSlaStatus(state: string, daysInState: number): 'green' | 'yellow' | 'red' | null {
  const hours = daysInState * 24
  let threshold: number | undefined

  if (state === 'Comprado') {
    threshold = COMPRADO_THRESHOLD_HOURS
  } else {
    const area = SLA_MAP[state]
    threshold = area ? SLA_THRESHOLDS[area] : undefined
  }

  if (!threshold) return null

  const pct = (hours / threshold) * 100
  if (pct < 50) return 'green'
  if (pct <= 80) return 'yellow'
  return 'red'
}

export async function GET(request: NextRequest) {
  try {
    const vehicles = await getVehicles()
    const activeStates = ['Comprado', 'En logística', 'En taller', 'En chapa', 'En preparación', 'Listo para venta']

    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list')

    if (list === 'true') {
      const active = vehicles.filter((v) => activeStates.includes(v.state))
      return NextResponse.json({ success: true, data: active })
    }

    const activeVehicles = vehicles.filter((v) => activeStates.includes(v.state))

    function calcDaysInState(v: (typeof activeVehicles)[number]): number {
      const refDate =
        v.state === 'En taller' ? v.fechaEntradaTaller
        : v.state === 'En preparación' ? v.fechaEntradaPreparacion
        : v.fechaCompra
      if (!refDate) return 0
      return Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
    }

    const pipeline = activeStates.map((state) => ({
      state,
      vehicles: activeVehicles
        .filter((v) => v.state === state)
        .map((v) => {
          const daysInState = calcDaysInState(v)
          return {
            id: v.id,
            name: v.name,
            matricula: v.matricula,
            brand: v.brand,
            model: v.model,
            year: v.year,
            combustible: v.combustible,
            daysInState,
            slaStatus: calcSlaStatus(v.state, daysInState),
          }
        }),
    }))

    return NextResponse.json({ success: true, data: { pipeline, total: activeVehicles.length } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, matricula, brand, model, year, lineaNegocio, tipo, fechaCompra, fechaListo, precioCompra, precioVenta } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    console.log('Creating vehicle with data:', JSON.stringify(body))
    const id = await createVehicle({ name, matricula, brand, model, year, lineaNegocio, tipo, fechaCompra, fechaListo, precioCompra, precioVenta })

    return NextResponse.json({ success: true, data: { id } }, { status: 201 })
  } catch (error: any) {
    console.error('Vehicle POST error details:', {
      message: error?.message,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      body: error?.body,
      status: error?.status,
    })
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create vehicle' },
      { status: 500 }
    )
  }
}
