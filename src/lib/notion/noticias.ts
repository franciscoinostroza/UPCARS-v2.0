import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType } from './schema'

export interface Noticia {
  id: string
  titulo: string
  cuerpo: string
  link: string | null
  autorId: string | null
  fecha: string | null
  activo: boolean
}

function parseNoticiaProps(id: string, p: Record<string, any>): Noticia {
  return {
    id,
    titulo: p.Título?.title?.[0]?.plain_text ?? '',
    cuerpo: (p.Cuerpo?.rich_text ?? []).map((t: any) => t.plain_text).join(''),
    link: p.Link?.url ?? null,
    autorId: p.Autor?.relation?.[0]?.id ?? null,
    fecha: p['Fecha de publicación']?.date?.start ?? null,
    activo: p.Activo?.checkbox ?? true,
  }
}

export async function getNoticias(): Promise<Noticia[]> {
  const dbId = getDatabaseId('noticias')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    filter: {
      property: 'Activo',
      checkbox: { equals: true },
    },
    sorts: [{ property: 'Fecha de publicación', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseNoticiaProps(r.id, r.properties))
}

export async function createNoticia(titulo: string, cuerpo: string, autorId: string, link?: string, fecha?: string) {
  const dbId = getDatabaseId('noticias')
  const today = fecha || new Date().toISOString().split('T')[0]
  const props: Record<string, any> = {
    Título: { title: [{ text: { content: titulo } }] },
    Cuerpo: { rich_text: [{ text: { content: cuerpo } }] },
    Autor: { relation: [{ id: autorId }] },
    'Fecha de publicación': { date: { start: today } },
    Activo: { checkbox: true },
  }
  if (link) {
    props.Link = { url: link }
  }
  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties: props,
  })
}

export async function archiveNoticia(noticiaId: string): Promise<void> {
  const schema = await getDbSchema('noticias')
  const checkboxKey = findPropertyByType(schema, 'checkbox') || 'Activo'
  await notionPatch(`/pages/${noticiaId}`, {
    properties: {
      [checkboxKey]: { checkbox: false },
    },
  })
}
