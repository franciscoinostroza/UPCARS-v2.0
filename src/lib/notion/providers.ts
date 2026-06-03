import { notionPost, getDatabaseId } from './client'

export async function getProviders() {
  const dbId = getDatabaseId('providers')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => ({
    id: r.id,
    name: r.properties?.['Nombre Empresa']?.title?.[0]?.plain_text || '',
  }))
}
