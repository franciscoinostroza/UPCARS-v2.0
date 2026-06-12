import { notionGet, notionPost, getDatabaseId } from './client'

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
