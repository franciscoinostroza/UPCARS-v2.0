import { NextResponse } from 'next/server'
import { setupGerencia } from '@/lib/notion/gerencia'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await setupGerencia()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Setup gerencia error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Setup failed' },
      { status: 500 }
    )
  }
}
