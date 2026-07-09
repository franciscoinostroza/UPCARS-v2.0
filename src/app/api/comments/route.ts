import { NextRequest, NextResponse } from 'next/server'

const NOTION_VERSION = '2022-06-28'
const BASE_URL = 'https://api.notion.com/v1'

function notionHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageId = searchParams.get('pageId')
    if (!pageId) {
      return NextResponse.json({ success: false, error: 'pageId required' }, { status: 400 })
    }

    const res = await fetch(`${BASE_URL}/comments?block_id=${pageId}`, { headers: notionHeaders() })
    if (!res.ok) throw new Error(`Notion comments GET failed: ${res.status}`)

    const data = await res.json()
    const comments = (data.results || []).map((c: any) => ({
      id: c.id,
      discussionId: c.discussion_id,
      text: c.rich_text?.[0]?.plain_text || '',
      authorName: c.created_by?.name || 'Bot',
      createdTime: c.created_time,
    }))

    return NextResponse.json({ success: true, data: comments })
  } catch (error: any) {
    console.error('Comments GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pageId, text, authorName } = body

    if (!pageId || !text) {
      return NextResponse.json({ success: false, error: 'pageId and text required' }, { status: 400 })
    }

    const content = authorName ? `[${authorName}] ${text}` : text

    const res = await fetch(`${BASE_URL}/comments`, {
      method: 'POST',
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { page_id: pageId },
        rich_text: [{ text: { content } }],
      }),
    })

    if (!res.ok) throw new Error(`Notion comments POST failed: ${res.status} ${await res.text()}`)

    const data = await res.json()
    return NextResponse.json({ success: true, data: { id: data.id } })
  } catch (error: any) {
    console.error('Comments POST error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
