import { notionGet, notionPost, notionPatch, getDatabaseId } from './client'

let userCache: Record<string, string> | null = null

async function getUsersByEmail(): Promise<Record<string, string>> {
  if (userCache) return userCache
  const data: any = await notionGet('/users')
  const map: Record<string, string> = {}
  for (const u of data.results || []) {
    if (u.type === 'person' && u.person?.email) {
      map[u.person.email.toLowerCase()] = u.id
    }
  }
  userCache = map
  return map
}

export function clearUserCache() {
  userCache = null
}

export async function createNotificacion(titulo: string, link: string | null, employeeEmails: string[], autorNombre?: string) {
  const users = await getUsersByEmail()
  const peopleIds = employeeEmails
    .map(e => users[e.toLowerCase()])
    .filter((id): id is string => !!id)

  if (peopleIds.length === 0) return

  const dbId = getDatabaseId('notificaciones')
  const bodyParts = [titulo]
  if (autorNombre) bodyParts.push(`\nPor: ${autorNombre}`)
  if (link) bodyParts.push(`\nLink: ${link}`)
  bodyParts.push('\n\n─────────\nPara leer la nota completa, ingresá a UPCARS.')

  const props: Record<string, any> = {
    Título: { title: [{ text: { content: titulo } }] },
    Cuerpo: { rich_text: [{ text: { content: bodyParts.join('') } }] },
    Asignado: { people: peopleIds.map((id: string) => ({ id })) },
    Leída: { checkbox: false },
    Fecha: { date: { start: new Date().toISOString().split('T')[0] } },
  }
  if (link) {
    props.Link = { url: link }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties: props,
  })
}

export async function cleanupOldNotificaciones(): Promise<number> {
  const dbId = getDatabaseId('notificaciones')
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const data: any = await notionPost(`/databases/${dbId}/query`, {
    filter: {
      property: 'Fecha',
      date: { before: threeDaysAgo },
    },
  })

  const pages = data.results || []
  await Promise.all(pages.map((p: any) => notionPatch(`/pages/${p.id}`, { archived: true })))
  return pages.length
}

export interface NotificacionItem {
  id: string
  titulo: string
  cuerpo: string
  leida: boolean
  fecha: string | null
  link: string | null
  asignados: { id: string; name: string }[]
}

export async function getNotificaciones(): Promise<NotificacionItem[]> {
  const dbId = getDatabaseId('notificaciones')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => {
    const p = r.properties
    const tituloArr = p['Título']?.title ?? []
    const cuerpoArr = p['Cuerpo']?.rich_text ?? []
    return {
      id: r.id,
      titulo: tituloArr[0]?.plain_text ?? '',
      cuerpo: cuerpoArr.map((r: any) => r.plain_text).join('') ?? '',
      leida: p['Leída']?.checkbox ?? false,
      fecha: p['Fecha']?.date?.start ?? null,
      link: p['Link']?.url ?? null,
      asignados: (p['Asignado']?.people ?? []).map((u: any) => ({ id: u.id, name: u.name || '' })),
    }
  })
}

export async function marcarLeida(id: string): Promise<void> {
  await notionPatch(`/pages/${id}`, { properties: { Leída: { checkbox: true } } })
}

export async function marcarTodasLeidas(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => notionPatch(`/pages/${id}`, { properties: { Leída: { checkbox: true } } }).catch(() => {})))
}

export async function getNotificacionesNoLeidas(): Promise<NotificacionItem[]> {
  const all = await getNotificaciones()
  return all.filter(n => !n.leida)
}
