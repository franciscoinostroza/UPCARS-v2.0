import { getReviews } from './gmb-client'
import { notionPost, getDatabaseId } from '@/lib/notion/client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from '@/lib/notion/schema'
import { GoogleReview } from '@/lib/types'

export async function getExistingReviewIds(): Promise<Set<string>> {
  const dbId = getDatabaseId('reviews')
  const schema = await getDbSchema('reviews')
  const richTexts = findPropertiesByType(schema, 'rich_text')
  const idKey = richTexts.find((r) => ['ID de reseña', 'Review ID', 'ID'].includes(r.name))?.name || richTexts[0]?.name

  const data: any = await notionPost(`/databases/${dbId}/query`)
  const ids = new Set<string>()

  for (const page of data.results || []) {
    const reviewId = page.properties?.[idKey]?.rich_text?.[0]?.plain_text
    if (reviewId) ids.add(reviewId)
  }

  return ids
}

export async function createReviewInNotion(review: GoogleReview): Promise<void> {
  const dbId = getDatabaseId('reviews')
  const schema = await getDbSchema('reviews')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre del autor'
  const richTexts = findPropertiesByType(schema, 'rich_text')
  const numberProps = findPropertiesByType(schema, 'number')
  const selectProps = findPropertiesByType(schema, 'select')
  const dateProps = findPropertiesByType(schema, 'date')
  const urlProps = findPropertiesByType(schema, 'url')

  function findByName(props: { name: string }[], candidates: string[], fallbackIdx: number): string {
    for (const c of candidates) {
      const found = props.find((p) => p.name === c)
      if (found) return found.name
    }
    return props[fallbackIdx]?.name || candidates[0]
  }

  const ratingKey = findByName(numberProps, ['Puntuación (1-5)', 'Puntuación', 'Rating', 'Score'], 0)
  const dateKey = findByName(dateProps, ['Fecha de publicación', 'Fecha', 'Publish date', 'Date'], 0)
  const statusKey = findByName(selectProps, ['Estado de respuesta', 'Estado', 'Status'], 0)
  const reviewIdKey = findByName(richTexts, ['ID de reseña', 'Review ID', 'ID'], 0)
  const commentKey = findByName(richTexts, ['Comentario', 'Comment'], 1)
  const urlKey = findByName(urlProps, ['Enlace a reseña', 'Review URL', 'URL', 'Link'], 0)

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: review.authorName } }] },
    [ratingKey]: { number: review.rating },
    [dateKey]: { date: { start: review.publishDate } },
    [statusKey]: { select: { name: 'Pendiente' } },
    [reviewIdKey]: { rich_text: [{ text: { content: review.id } }] },
  }

  if (review.comment) {
    properties[commentKey] = { rich_text: [{ text: { content: review.comment } }] }
  }

  if (review.reviewUrl) {
    properties[urlKey] = { url: review.reviewUrl }
  }

  await notionPost('/pages', {
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
