import { NextRequest, NextResponse } from 'next/server'
import { getNoticias, createNoticia } from '@/lib/notion/noticias'
import { getEmployees } from '@/lib/notion/employees'
import { createNotificacion } from '@/lib/notion/notifications'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const noticias = await getNoticias()
    return NextResponse.json({ success: true, data: noticias })
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
    const { titulo, cuerpo, autorId, link, fecha } = body

    if (!titulo || !cuerpo || !autorId) {
      return NextResponse.json(
        { success: false, error: 'titulo, cuerpo and autorId are required' },
        { status: 400 }
      )
    }

    const cleanLink = link?.trim()
    const normalizedLink = cleanLink && !cleanLink.startsWith('http') ? `https://${cleanLink}` : cleanLink
    await createNoticia(titulo.trim(), cuerpo.trim(), autorId, normalizedLink || undefined, fecha || undefined)

    const employees = await getEmployees()
    const autor = employees.find(e => e.id === autorId)
    const activeEmails = employees.filter(e => e.active && e.email).map(e => e.email)
    await createNotificacion(
      `📢 Nueva noticia: ${titulo.trim()}`,
      normalizedLink || null,
      activeEmails,
      autor?.name
    )

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Noticias POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create noticia' },
      { status: 500 }
    )
  }
}
