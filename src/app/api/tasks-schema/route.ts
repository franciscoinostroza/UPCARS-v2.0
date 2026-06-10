import { NextResponse } from 'next/server'
import { notionGet, getDatabaseId } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const dbId = getDatabaseId('tasks')
    const data: any = await notionGet(`/databases/${dbId}`)
    const props = data.properties || {}
    const selects: Record<string, string[]> = {}
    for (const [name, prop] of Object.entries(props)) {
      const p = prop as any
      if (p.type === 'select') {
        selects[name] = p.select.options.map((o: any) => o.name)
      }
    }
    return NextResponse.json({ success: true, selects })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message })
  }
}
