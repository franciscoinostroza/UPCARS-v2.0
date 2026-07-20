import { NextRequest, NextResponse } from 'next/server'
import { notionPost, notionPatch, getDatabaseId } from '@/lib/notion/client'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const CRON_SECRET = process.env.CRON_SECRET

const CONFIG: { key: string; terminalStates: string[]; dateField: string }[] = [
  { key: 'workshop', terminalStates: ['Terminado'], dateField: 'Fecha salida taller' },
  { key: 'chapa', terminalStates: ['Terminado'], dateField: 'Fecha retorno' },
  { key: 'preparacion', terminalStates: ['Listo para stock'], dateField: 'Fecha fin' },
  { key: 'logistics', terminalStates: ['Completado'], dateField: 'Fecha realizada' },
]

async function getSchema(dbId: string) {
  const res = await notionGet(`/databases/${dbId}`)
  return (res as any).properties || {}
}

async function notionGet(path: string) {
  const BASE_URL = 'https://api.notion.com/v1'
  const headers = {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) throw new Error(`Notion GET ${path} failed: ${res.status}`)
  return res.json()
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('token') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, number> = {}
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  for (const cfg of CONFIG) {
    try {
      const dbId = getDatabaseId(cfg.key)
      const archived: string[] = []

      const data: any = await notionPost(`/databases/${dbId}/query`, {
        filter: {
          and: [
            {
              property: 'Estado',
              select: { equals: cfg.terminalStates[0] },
            },
          ],
        },
      })

      for (const page of data.results || []) {
        const fechaVal = page.properties?.[cfg.dateField]?.date?.start
        if (fechaVal && fechaVal < thirtyDaysAgo) {
          await notionPatch(`/pages/${page.id}`, { archived: true })
          archived.push(page.id)
        }
      }

      results[cfg.key] = archived.length
    } catch (e: any) {
      results[cfg.key] = -1
      console.error(`Cleanup ${cfg.key} error:`, e.message)
    }
  }

  return NextResponse.json({ success: true, archived: results })
}
