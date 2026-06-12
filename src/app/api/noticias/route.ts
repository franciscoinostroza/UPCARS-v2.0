import { NextRequest, NextResponse } from 'next/server'
import { getNoticias, createNoticia } from '@/lib/notion/noticias'
import { fetchOGData } from '@/lib/og-fetcher'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const noticias = await getNoticias()

    const enriched = []
    for (const n of noticias) {
      const url = n.link?.startsWith('http') ? n.link : `https://${n.link}`
      const linkPreview = n.link ? await fetchOGData(url) : null
      enriched.push({ ...n, linkPreview })
    }

    return NextResponse.json({ success: true, data: enriched })
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
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Noticias POST error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create noticia' },
      { status: 500 }
    )
  }
}
