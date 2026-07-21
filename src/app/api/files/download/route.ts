import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    const property = searchParams.get('property')
    const index = parseInt(searchParams.get('index') || '0')
    const preview = searchParams.get('preview') === 'true'

    if (!pageId || !property) {
      return NextResponse.json({ error: 'pageId and property required' }, { status: 400 })
    }

    const token = process.env.NOTION_TOKEN
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Notion API error' }, { status: 500 })
    }

    const data: any = await res.json()
    const files = data.properties?.[property]?.files
    if (!files || !files[index]) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = files[index]
    const fileUrl = file.file?.url ?? file.external?.url
    if (!fileUrl) {
      return NextResponse.json({ error: 'File URL not available' }, { status: 404 })
    }

    const fileName = file.name || 'archivo'

    // Proxy the file: fetch from Notion's CDN and stream it
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) {
      // If proxy fails, redirect directly to the URL (might work for some files)
      return NextResponse.redirect(fileUrl)
    }

    const blob = await fileRes.blob()
    const headers: Record<string, string> = {
      'Content-Type': fileRes.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }
    if (!preview) {
      headers['Content-Disposition'] = `attachment; filename="${fileName}"`
    }
    return new NextResponse(blob, { headers })
  } catch (error: any) {
    console.error('Download error:', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }
}
