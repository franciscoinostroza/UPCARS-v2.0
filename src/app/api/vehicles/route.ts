import { NextRequest, NextResponse } from 'next/server'
import { getVehicles, createVehicle } from '@/lib/notion/vehicles'
import { SLA_THRESHOLDS, STUCK_THRESHOLDS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const SLA_UBICACION_MAP: Record<string, string> = {
  'Taller Mecánica': 'Taller',
  'Taller Chapa': 'Chapa',
  'Taller Preparación': 'Preparacion',
}

const SITUACIONES_ACTIVAS = ['Stock', 'Exposición']

function calcSlaStatus(ubicacion: string, daysInUbicacion: number): 'green' | 'yellow' | 'red' | null {
  const hours = daysInUbicacion * 24
  const area = SLA_UBICACION_MAP[ubicacion]
  const threshold = area ? SLA_THRESHOLDS[area] : STUCK_THRESHOLDS[ubicacion]
  if (!threshold) return null
  const pct = (hours / (threshold * 24)) * 100
  if (pct < 50) return 'green'
  if (pct <= 80) return 'yellow'
  return 'red'
}

export async function GET(request: NextRequest) {
  try {
    const vehicles = await getVehicles()
    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list')
    const filterResponsable = searchParams.get('responsable')
    const filterBrand = searchParams.get('marca')
    const filterLinea = searchParams.get('linea')
    const filterUbicacion = searchParams.get('ubicacion')

    let activeVehicles = vehicles.filter((v) => SITUACIONES_ACTIVAS.includes(v.situacion))

    if (filterResponsable) activeVehicles = activeVehicles.filter(v => v.responsable === filterResponsable)
    if (filterBrand) activeVehicles = activeVehicles.filter(v => v.brand.toLowerCase().includes(filterBrand.toLowerCase()))
    if (filterLinea) activeVehicles = activeVehicles.filter(v => v.lineaNegocio === filterLinea)
    if (filterUbicacion) activeVehicles = activeVehicles.filter(v => v.ubicacion === filterUbicacion)

    if (list === 'true') return NextResponse.json({ success: true, data: activeVehicles })

    function calcDaysInUbicacion(v: typeof activeVehicles[number]): number {
      const refDate = v.ubicacion === 'Taller Mecánica' ? v.fechaEntradaTaller
        : v.ubicacion === 'Taller Preparación' ? v.fechaEntradaPreparacion
        : v.fechaCompra
      if (!refDate) return 0
      return Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
    }

    const pipeline = SITUACIONES_ACTIVAS.map((situacion) => ({
      state: situacion,
      vehicles: activeVehicles
        .filter((v) => v.situacion === situacion)
        .map((v) => {
          const daysInUbicacion = calcDaysInUbicacion(v)
          return {
            id: v.id,
            name: v.name,
            matricula: v.matricula,
            brand: v.brand,
            model: v.model,
            year: v.year,
            combustible: v.combustible,
            ubicacion: v.ubicacion,
            daysInUbicacion,
            daysInState: daysInUbicacion,
            slaStatus: calcSlaStatus(v.ubicacion, daysInUbicacion),
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
