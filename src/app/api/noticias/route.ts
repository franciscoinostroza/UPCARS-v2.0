import { NextRequest, NextResponse } from 'next/server'
import { getNoticias, createNoticia } from '@/lib/notion/noticias'
import { getNoticiasVistas } from '@/lib/supabase/noticias'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const empleadoId = request.nextUrl.searchParams.get('empleadoId')
    const [noticias, vistas] = await Promise.all([
      getNoticias(),
      empleadoId ? getNoticiasVistas(empleadoId) : Promise.resolve([]),
    ])
    const data = noticias.map((n) => ({
      ...n,
      visto: vistas.includes(n.id),
    }))
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Noticias GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch noticias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { titulo, cuerpo, autorId, fecha } = body

    if (!titulo || !cuerpo || !autorId) {
      return NextResponse.json(
        { success: false, error: 'titulo, cuerpo and autorId are required' },
        { status: 400 }
      )
    }

    await createNoticia(titulo.trim(), cuerpo.trim(), autorId, fecha || undefined)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Noticias POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create noticia' },
      { status: 500 }
    )
  }
}
