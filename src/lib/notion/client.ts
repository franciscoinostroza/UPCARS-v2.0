const NOTION_VERSION = '2022-06-28'
const BASE_URL = 'https://api.notion.com/v1'

const headers: Record<string, string> = {
  'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
}

export async function notionGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) {
    throw new Error(`Notion GET ${path} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function notionPost<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    throw new Error(`Notion POST ${path} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function notionPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Notion PATCH ${path} failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export function getDatabaseId(name: string): string {
  const ids: Record<string, string | undefined> = {
    vehicles: process.env.VEHICLES_DB_ID,
    employees: process.env.EMPLOYEES_DB_ID,
    workshop: process.env.WORKSHOP_DB_ID,
    chapa: process.env.CHAPA_DB_ID,
    preparacion: process.env.PREPARACION_DB_ID,
    logistics: process.env.LOGISTICS_DB_ID,
    tasks: process.env.TASKS_DB_ID,
    ventas: process.env.VENTAS_DB_ID,
    calendario_operativo: process.env.CALENDARIO_OPERATIVO_DB_ID || process.env.CALENDARIO_DB_ID,
    calendario: process.env.CALENDARIO_DB_ID || process.env.CALENDARIO_OPERATIVO_DB_ID,
    calendario_rrhh: process.env.CALENDARIO_RRHH_DB_ID,
    marketing: process.env.MARKETING_DB_ID,
    reviews: process.env.GOOGLE_REVIEWS_DB_ID,
    providers: process.env.PROVIDERS_DB_ID,
    financieras: process.env.FINANCIERAS_DB_ID,
    operaciones_financiadas: process.env.OPERACIONES_FINANCIADAS_DB_ID,
    finanzas: process.env.FINANZAS_DB_ID,
    buzon_mejora: process.env.BUZON_MEJORA_DB_ID,
    noticias: process.env.NOTICIAS_DB_ID,
    notificaciones: process.env.NOTIFICACIONES_DB_ID,
    tasaciones: process.env.TASACIONES_DB_ID,
  }
  const id = ids[name]
  if (!id) throw new Error(`Database ID not found for: ${name}`)
  return id
}
