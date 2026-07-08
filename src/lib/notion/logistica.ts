import { notionPost, getDatabaseId } from './client'

export interface LogisticaRecord {
  id: string
  nombre: string
  vehiculoId: string | null
  responsableId: string | null
  estado: string
  fechaProgramada: string | null
  fechaRealizada: string | null
  ubicacion: string
  situacionComercial: string
  prioridad: string
  observaciones: string
}

function parseLogisticaProps(id: string, p: Record<string, any>): LogisticaRecord {
  return {
    id,
    nombre: p['Nombre / ID']?.title?.[0]?.plain_text ?? '',
    vehiculoId: p['Vehículo']?.relation?.[0]?.id ?? null,
    responsableId: p['Responsable']?.relation?.[0]?.id ?? null,
    estado: p['Estado']?.select?.name ?? '',
    fechaProgramada: p['Fecha programada']?.date?.start ?? null,
    fechaRealizada: p['Fecha realizada']?.date?.start ?? null,
    ubicacion: p['UBICACION']?.rich_text?.[0]?.plain_text ?? '',
    situacionComercial: p['Situación comercial']?.select?.name ?? '',
    prioridad: p['Prioridad']?.select?.name ?? '',
    observaciones: p['Observaciones']?.rich_text?.[0]?.plain_text ?? '',
  }
}

export async function getLogisticaRecords(): Promise<LogisticaRecord[]> {
  const dbId = getDatabaseId('logistics')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha programada', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseLogisticaProps(r.id, r.properties))
}
