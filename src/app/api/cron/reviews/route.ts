import { NextRequest, NextResponse } from 'next/server'
import { syncGoogleReviews } from '@/lib/google/reviews'

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
