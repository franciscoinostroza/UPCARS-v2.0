import { NextRequest, NextResponse } from 'next/server'
import { handleAlertCheck } from '@/lib/automations/alerts'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await handleAlertCheck()

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Alerts check error:', error)
    return NextResponse.json(
      { success: false, error: 'Alerts check failed' },
      { status: 500 }
    )
  }
}
