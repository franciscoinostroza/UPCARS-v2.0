import { NextRequest, NextResponse } from 'next/server'
import { getNoticias, createNoticia } from '@/lib/notion/noticias'
import { extractUrls, fetchOGData } from '@/lib/og-fetcher'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const noticias = await getNoticias()

    const enriched = await Promise.all(
      noticias.map(async (n) => {
        const urls = extractUrls(n.cuerpo)
        const linkPreview = urls.length > 0 ? await fetchOGData(urls[0]) : null
        return { ...n, linkPreview }
      })
    )

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
