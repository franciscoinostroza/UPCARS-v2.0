import { getReviews } from './gmb-client'
import { notionPost, getDatabaseId } from '@/lib/notion/client'
import { GoogleReview } from '@/lib/types'

export async function getExistingReviewIds(): Promise<Set<string>> {
  const dbId = getDatabaseId('reviews')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  const ids = new Set<string>()

  for (const page of data.results || []) {
    const reviewId = page.properties?.['ID de reseña']?.rich_text?.[0]?.plain_text
    if (reviewId) ids.add(reviewId)
  }

  return ids
}

export async function createReviewInNotion(review: GoogleReview): Promise<void> {
  const dbId = getDatabaseId('reviews')

  const properties: Record<string, unknown> = {
    'Nombre del autor': { title: [{ text: { content: review.authorName } }] },
    'Puntuación (1-5)': { number: review.rating },
    'Fecha de publicación': { date: { start: review.publishDate } },
    'Estado de respuesta': { select: { name: 'Pendiente' } },
    'ID de reseña': { rich_text: [{ text: { content: review.id } }] },
  }

  if (review.comment) {
    properties['Comentario'] = { rich_text: [{ text: { content: review.comment } }] }
  }

  if (review.reviewUrl) {
    properties['Enlace a reseña'] = { url: review.reviewUrl }
  }

  await notionPost(`/pages`, {
    parent: { database_id: dbId },
    properties,
  })
}

export async function syncGoogleReviews(): Promise<number> {
  const [existingIds, reviews] = await Promise.all([
    getExistingReviewIds(),
    getReviews(),
  ])

  let newReviews = 0

  for (const review of reviews) {
    const typedReview: any = review
    const googleReview: GoogleReview = {
      id: typedReview.reviewId || '',
      authorName: typedReview.reviewer?.displayName || 'Anónimo',
      rating: typedReview.starRating || 0,
      comment: typedReview.comment || null,
      publishDate: typedReview.createTime || '',
      reviewUrl: typedReview.reviewReply?.comment || null,
    }

    if (!googleReview.id || existingIds.has(googleReview.id)) continue

    await createReviewInNotion(googleReview)
    newReviews++
  }

  return newReviews
}
