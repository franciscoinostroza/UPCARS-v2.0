import { NextRequest, NextResponse } from 'next/server'
import { marcarVisto, getVistos } from '@/lib/supabase/noticias'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const vistos = await getVistos(id)
    return NextResponse.json({ success: true, data: vistos })
  } catch (error: any) {
    console.error('Noticia VISTO GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vistos' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { empleadoId } = body

    if (!empleadoId) {
      return NextResponse.json(
        { success: false, error: 'empleadoId is required' },
        { status: 400 }
      )
    }

    await marcarVisto(id, empleadoId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Noticia VISTO error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to mark as seen' },
      { status: 500 }
    )
  }
}
