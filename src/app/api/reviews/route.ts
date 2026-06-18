import { NextResponse } from 'next/server'
import { getReviews } from '@/lib/notion/reviews'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const reviews = await getReviews()

    const kpis = {
      total: reviews.length,
      promedio: reviews.length > 0
        ? Math.round(reviews.reduce((s, r) => s + (r.puntuacion ?? 0), 0) / reviews.length * 10) / 10
        : 0,
      distribucion: [1, 2, 3, 4, 5].map(n => ({
        estrellas: n,
        cantidad: reviews.filter(r => Math.round(r.puntuacion ?? 0) === n).length,
      })),
      pendientes: reviews.filter(r => r.estado === 'Pendiente' || !r.estado).length,
      respondidas: reviews.filter(r => r.estado === 'Respondida' || r.textoRespuesta).length,
    }

    return NextResponse.json({
      success: true,
      data: { reviews, kpis },
    })
  } catch (error: any) {
    console.error('Reviews GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}
