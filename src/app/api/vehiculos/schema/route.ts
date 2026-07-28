import { NextResponse } from 'next/server'
import { getDbSchema } from '@/lib/notion/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const schema = await getDbSchema('vehicles')
    const props = schema.properties || {}
    const selects: Record<string, string[]> = {}
    for (const [name, p] of Object.entries(props)) {
      if ((p as any).type === 'select') {
        selects[name] = ((p as any).select?.options || []).map((o: any) => o.name)
      }
    }
    return NextResponse.json({ success: true, data: selects })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
