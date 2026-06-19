import { notionPost, notionPatch } from './client'

const HOME_PAGE_ID = '36cf70f8-4701-8075-b917-e92236b444af'
const KPI_PAGE_ID = '383f70f8-4701-80f0-bc86-eef5943f2f61'
const BASE_URL = 'https://upcars.pixelarch.dev'

async function createSubPage(title: string, embedUrl?: string): Promise<string> {
  const data: any = await notionPost('/pages', {
    parent: { page_id: HOME_PAGE_ID },
    properties: {
      title: { title: [{ text: { content: title } }] },
    },
  })
  const pageId = data.id

  if (embedUrl) {
    await notionPatch(`/blocks/${pageId}/children`, {
      children: [
        {
          object: 'block',
          type: 'embed',
          embed: { url: embedUrl },
        },
      ],
    })
  }

  return pageId
}

export async function setupGerencia() {
  const pages: { title: string; embedUrl: string }[] = [
    { title: 'Ventas', embedUrl: `${BASE_URL}/ventas` },
    { title: 'Finanzas', embedUrl: `${BASE_URL}/finanzas` },
    { title: 'Calendario', embedUrl: `${BASE_URL}/calendario` },
  ]

  const created: Record<string, string> = {}

  for (const p of pages) {
    try {
      const id = await createSubPage(p.title, p.embedUrl)
      created[p.title] = id
    } catch (err) {
      console.error(`Error creating page "${p.title}":`, err)
    }
  }

  const allIds = { KPI: KPI_PAGE_ID, ...created }
  const gerenciaId = await createSubPage('Panel de Gerencia')

  const mentionBlocks = Object.entries(allIds).filter(([, id]) => id).map(([name, id]) => ({
    object: 'block' as const,
    type: 'paragraph' as const,
    paragraph: {
      rich_text: [
        {
          type: 'mention',
          mention: { type: 'page', page: { id } },
        },
      ],
    },
  }))

  await notionPatch(`/blocks/${gerenciaId}/children`, {
    children: mentionBlocks,
  })

  return {
    pages: created,
    gerenciaId,
    gerenciaUrl: `https://www.notion.so/${gerenciaId.replace(/-/g, '')}`,
  }
}
