import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldNotificaciones } from '@/lib/notion/notifications'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deleted = await cleanupOldNotificaciones()

    return NextResponse.json({
      success: true,
      deleted,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cleanup notifications error:', error)
    return NextResponse.json(
      { success: false, error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}
