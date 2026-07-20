import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export interface FinancieraItem {
  id: string
  nombre: string
  estado: string
  telefono: string
  email: string
  personaContacto: string
  datosAcceso: string
  enlaceAcceso: string
  notas: string
  tarifasLeasing: { name: string; url: string }[]
  tarifasVnVo: { name: string; url: string }[]
}

function parseFinancieraProps(id: string, p: Record<string, any>): FinancieraItem {
  return {
    id,
    nombre: p['Nombre financiera']?.title?.[0]?.plain_text ?? '',
    estado: p['Estado']?.select?.name ?? '',
    telefono: p['Teléfono']?.phone_number ?? '',
    email: p['Email']?.email ?? '',
    personaContacto: p['Persona de contacto']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    datosAcceso: p['Datos de Acceso']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    enlaceAcceso: p['Enlace de Acceso']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    notas: p['Notas']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    tarifasLeasing: (p['Tarifas Leasing']?.files ?? []).map((f: any) => ({ name: f.name, url: f.file?.url ?? f.external?.url ?? '' })),
    tarifasVnVo: (p['Tarifas vigentes VN - VO']?.files ?? []).map((f: any) => ({ name: f.name, url: f.file?.url ?? f.external?.url ?? '' })),
  }
}

export async function getFinancieras(): Promise<FinancieraItem[]> {
  const dbId = getDatabaseId('financieras')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseFinancieraProps(r.id, r.properties))
}

export async function createFinanciera(data: {
  nombre: string
  estado?: string
  telefono?: string
  email?: string
  personaContacto?: string
  datosAcceso?: string
  enlaceAcceso?: string
  notas?: string
}) {
  const dbId = getDatabaseId('financieras')
  const schema = await getDbSchema('financieras')
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre financiera'
  const selects = findPropertiesByType(schema, 'select') || []
  const richTexts = findPropertiesByType(schema, 'rich_text') || []

  const estadoKey = selects.find(s => s.name === 'Estado')?.name || selects[0]?.name
  const contactoKey = richTexts.find(r => r.name === 'Persona de contacto')?.name || richTexts[0]?.name
  const accesoKey = richTexts.find(r => r.name === 'Datos de Acceso')?.name || richTexts[1]?.name
  const enlaceKey = richTexts.find(r => r.name === 'Enlace de Acceso')?.name || richTexts[2]?.name
  const notasKey = richTexts.find(r => r.name === 'Notas')?.name || richTexts[3]?.name

  const props: Record<string, any> = {
    [titleKey]: { title: [{ text: { content: data.nombre } }] },
  }
  if (data.estado && estadoKey) props[estadoKey] = { select: { name: data.estado } }
  if (data.telefono) props['Teléfono'] = { phone_number: data.telefono }
  if (data.email) props['Email'] = { email: data.email }
  if (data.personaContacto && contactoKey) props[contactoKey] = { rich_text: [{ text: { content: data.personaContacto } }] }
  if (data.datosAcceso && accesoKey) props[accesoKey] = { rich_text: [{ text: { content: data.datosAcceso } }] }
  if (data.enlaceAcceso && enlaceKey) props[enlaceKey] = { rich_text: [{ text: { content: data.enlaceAcceso } }] }
  if (data.notas && notasKey) props[notasKey] = { rich_text: [{ text: { content: data.notas } }] }

  await notionPost('/pages', { parent: { database_id: dbId }, properties: props })
}

export async function updateFinanciera(id: string, data: Record<string, any>) {
  const props: Record<string, any> = {}
  if (data.estado) props['Estado'] = { select: { name: data.estado } }
  if (data.telefono !== undefined) props['Teléfono'] = { phone_number: data.telefono }
  if (data.email !== undefined) props['Email'] = { email: data.email }
  if (data.personaContacto !== undefined) props['Persona de contacto'] = { rich_text: [{ text: { content: data.personaContacto } }] }
  if (data.datosAcceso !== undefined) props['Datos de Acceso'] = { rich_text: [{ text: { content: data.datosAcceso } }] }
  if (data.enlaceAcceso !== undefined) props['Enlace de Acceso'] = { rich_text: [{ text: { content: data.enlaceAcceso } }] }
  if (data.notas !== undefined) props['Notas'] = { rich_text: [{ text: { content: data.notas } }] }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${id}`, { properties: props })
}
