import { NextRequest, NextResponse } from 'next/server'
import { getVehicles, createVehicle } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

const AREA_ORDER = ['Logística', 'Taller', 'Chapa', 'Preparación', 'Stock', 'Exposición', 'Vendido', 'Cedido']

function getArea(estadoActual: string): string {
  if (estadoActual.startsWith('Logística')) return 'Logística'
  if (estadoActual.startsWith('Taller')) return 'Taller'
  if (estadoActual.startsWith('Chapa')) return 'Chapa'
  if (estadoActual.startsWith('Preparación')) return 'Preparación'
  if (estadoActual === 'Vendido') return 'Vendido'
  if (estadoActual === 'Cedido') return 'Cedido'
  if (estadoActual === 'Exposición') return 'Exposición'
  return 'Stock'
}

const ESTADOS_ACTIVOS = ['Logística', 'Taller', 'Chapa', 'Preparación', 'Stock', 'Exposición']

export async function GET(request: NextRequest) {
  try {
    const vehicles = await getVehicles()
    const { searchParams } = new URL(request.url)
    const list = searchParams.get('list')
    const filterResponsable = searchParams.get('responsable')
    const filterBrand = searchParams.get('marca')
    const filterLinea = searchParams.get('linea')

    let activeVehicles = vehicles.filter((v) => ESTADOS_ACTIVOS.includes(getArea(v.estadoActual)))

    if (filterResponsable) activeVehicles = activeVehicles.filter(v => v.responsable === filterResponsable)
    if (filterBrand) activeVehicles = activeVehicles.filter(v => v.brand.toLowerCase().includes(filterBrand.toLowerCase()))
    if (filterLinea) activeVehicles = activeVehicles.filter(v => v.lineaNegocio === filterLinea)

    if (list === 'true') return NextResponse.json({ success: true, data: activeVehicles })

    function calcDaysInArea(v: typeof activeVehicles[number]): number {
      if (!v.fechaCompra) return 0
      return Math.floor((Date.now() - new Date(v.fechaCompra).getTime()) / (1000 * 60 * 60 * 24))
    }

    const pipeline = AREA_ORDER.filter(a => ESTADOS_ACTIVOS.includes(a) || a === 'Vendido' || a === 'Cedido').map((area) => ({
      state: area,
      vehicles: activeVehicles
        .filter((v) => getArea(v.estadoActual) === area)
        .map((v) => ({
          id: v.id,
          name: v.name,
          matricula: v.matricula,
          brand: v.brand,
          model: v.model,
          year: v.year,
          combustible: v.combustible,
          ubicacion: v.subEstado,
          daysInUbicacion: calcDaysInArea(v),
          daysInState: calcDaysInArea(v),
          slaStatus: null as 'green' | 'yellow' | 'red' | null,
        })),
    })).filter(col => col.vehicles.length > 0 || ESTADOS_ACTIVOS.includes(col.state))

    return NextResponse.json({ success: true, data: { pipeline, total: activeVehicles.length } })
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, matricula, brand, model, year, lineaNegocio, tipo, color, combustible, kilometrajeEntrada, notas, fechaCompra, fechaListo, precioCompra, precioVenta } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'name is required' },
        { status: 400 }
      )
    }

    const id = await createVehicle({
      name, matricula, brand, model, year, lineaNegocio, tipo,
      color, combustible, kilometrajeEntrada, notas,
      fechaCompra, fechaListo, precioCompra, precioVenta,
    })

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
