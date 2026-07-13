import { NextResponse } from 'next/server'
import { getProviders } from '@/lib/notion/providers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getProviders()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Providers GET error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 })
  }
}
