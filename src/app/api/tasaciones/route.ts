import { NextRequest, NextResponse } from 'next/server'
import { getTasaciones, createTasacion } from '@/lib/notion/tasaciones'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')

    let records = await getTasaciones()
    const [employees] = await Promise.all([getEmployees()])
    const empMap = new Map(employees.map(e => [e.id, e.name]))

    if (filterEstado) records = records.filter(r => r.estado === filterEstado)

    const data = records.map(r => ({
      ...r,
      responsableNombre: r.responsableId ? (empMap.get(r.responsableId) || 'Desconocido') : null,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Tasaciones GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nombre) {
      return NextResponse.json({ success: false, error: 'nombre required' }, { status: 400 })
    }
    await createTasacion(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Tasaciones POST error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
