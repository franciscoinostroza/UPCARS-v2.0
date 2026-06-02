import { notionGet, getDatabaseId } from './client'

let schemaCache: Record<string, any> = {}

export async function getDbSchema(name: string): Promise<any> {
  const dbId = getDatabaseId(name)
  if (schemaCache[dbId]) return schemaCache[dbId]
  const data: any = await notionGet(`/databases/${dbId}`)
  schemaCache[dbId] = data
  return data
}

export function clearSchemaCache() {
  schemaCache = {}
}

export function findPropertyByType(schema: any, type: string): string | null {
  for (const [name, prop] of Object.entries(schema.properties)) {
    if ((prop as any).type === type) return name
  }
  return null
}

export function findPropertiesByType(schema: any, type: string): { name: string; prop: any }[] {
  const results: { name: string; prop: any }[] = []
  for (const [name, prop] of Object.entries(schema.properties)) {
    if ((prop as any).type === type) results.push({ name, prop })
  }
  return results
}
