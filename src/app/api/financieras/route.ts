import { NextRequest, NextResponse } from 'next/server'
import { getFinancieras, createFinanciera } from '@/lib/notion/financieras'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filterEstado = searchParams.get('estado')
    let records = await getFinancieras()
    if (filterEstado) records = records.filter(r => r.estado === filterEstado)
    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    console.error('Financieras GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.nombre) {
      return NextResponse.json({ success: false, error: 'nombre required' }, { status: 400 })
    }
    await createFinanciera(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Financieras POST error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
