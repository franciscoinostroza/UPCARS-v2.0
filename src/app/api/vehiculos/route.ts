import { NextRequest, NextResponse } from 'next/server'
import { getVehicles } from '@/lib/notion/vehicles'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')
    const filterResponsable = searchParams.get('responsable')
    const filterMarca = searchParams.get('marca')
    const filterLinea = searchParams.get('linea')
    const filterSituacion = searchParams.get('situacion')
    const q = searchParams.get('q')

    const [vehicles, employees] = await Promise.all([getVehicles(), getEmployees()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))

    let records = vehicles as any[]

    if (filterEstado) records = records.filter(r => r.estadoActual === filterEstado)
    if (filterResponsable) records = records.filter(r => r.responsable === filterResponsable)
    if (filterMarca) records = records.filter(r => r.brand.toLowerCase().includes(filterMarca.toLowerCase()))
    if (filterLinea) records = records.filter(r => r.lineaNegocio === filterLinea)
    if (filterSituacion) records = records.filter(r => r.situacion === filterSituacion)
    if (q) {
      const ql = q.toLowerCase()
      records = records.filter(r => r.matricula.toLowerCase().includes(ql) || r.brand.toLowerCase().includes(ql) || r.model.toLowerCase().includes(ql))
    }

    const data = records.map(r => ({
      ...r,
      responsableNombre: r.responsable ? (empMap.get(r.responsable) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Vehículos GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
