import { NextRequest, NextResponse } from 'next/server'
import { syncGoogleReviews } from '@/lib/google/reviews'
import { sendEmail } from '@/lib/email/send'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const newReviews = await syncGoogleReviews()

    if (newReviews > 0 && process.env.ADMIN_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `⭐ ${newReviews} nueva${newReviews > 1 ? 's' : ''} reseña${newReviews > 1 ? 's' : ''} en Google`,
        html: `<p>Se ha${newReviews > 1 ? 'n' : ''} detectado <strong>${newReviews}</strong> nueva${newReviews > 1 ? 's' : ''} reseña${newReviews > 1 ? 's' : ''} en Google My Business.</p>
<p>Revisa la base de datos de reseñas en Notion para más detalles.</p>
<p>Fecha: ${new Date().toLocaleString('es-ES')}</p>`,
      })
    }

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      newReviews,
    })
  } catch (error) {
    console.error('Reviews sync error:', error)
    return NextResponse.json(
      { success: false, error: 'Reviews sync failed' },
      { status: 500 }
    )
  }
}
