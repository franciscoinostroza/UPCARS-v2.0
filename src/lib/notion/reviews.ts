import { notionPost, getDatabaseId } from './client'

export interface ReviewItem {
  id: string
  autor: string
  puntuacion: number | null
  comentario: string
  fecha: string | null
  estado: string
  textoRespuesta: string
  enlace: string | null
}

function parseReviewProps(id: string, p: Record<string, any>): ReviewItem {
  return {
    id,
    autor: p['Nombre del autor']?.title?.[0]?.plain_text ?? '',
    puntuacion: p['Puntuación']?.number ?? null,
    comentario: p['Comentario']?.rich_text?.[0]?.plain_text ?? '',
    fecha: p['Fecha de publicación']?.date?.start ?? null,
    estado: p['Estado de respuesta']?.select?.name ?? '',
    textoRespuesta: p['Texto de respuesta']?.rich_text?.[0]?.plain_text ?? '',
    enlace: p['Enlace a reseña']?.url ?? null,
  }
}

export async function getReviews(): Promise<ReviewItem[]> {
  const dbId = getDatabaseId('reviews')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha de publicación', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseReviewProps(r.id, r.properties))
}
