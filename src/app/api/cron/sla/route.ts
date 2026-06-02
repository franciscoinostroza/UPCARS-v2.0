import { NextRequest, NextResponse } from 'next/server'
import { checkSLAs } from '@/lib/automations/sla-engine'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const violations = await checkSLAs()

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      violationsCount: violations.length,
      violations,
    })
  } catch (error) {
    console.error('SLA check error:', error)
    return NextResponse.json(
      { success: false, error: 'SLA check failed' },
      { status: 500 }
    )
  }
}
