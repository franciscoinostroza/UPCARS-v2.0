import { NextRequest, NextResponse } from 'next/server'
import { getNotificaciones, marcarLeida, marcarTodasLeidas } from '@/lib/notion/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter')

    let records = await getNotificaciones()
    if (filter === 'noleidas') records = records.filter(n => !n.leida)
    else if (filter === 'leidas') records = records.filter(n => n.leida)

    return NextResponse.json({ success: true, data: records })
  } catch (error: any) {
    console.error('Notificaciones GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, marcarTodas, ids } = body

    if (marcarTodas && ids) {
      await marcarTodasLeidas(ids)
      return NextResponse.json({ success: true, message: `Marcadas ${ids.length} como leídas` })
    }

    if (id) {
      await marcarLeida(id)
      return NextResponse.json({ success: true, data: { id } })
    }

    return NextResponse.json({ success: false, error: 'id or marcarTodas required' }, { status: 400 })
  } catch (error: any) {
    console.error('Notificaciones PATCH error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
