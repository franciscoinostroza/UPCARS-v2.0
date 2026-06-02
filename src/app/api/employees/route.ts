import { NextResponse } from 'next/server'
import { getEmployees } from '@/lib/notion/employees'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const employees = await getEmployees()
    const active = employees.filter((e) => e.active)

    return NextResponse.json({ success: true, data: active })
  } catch (error: any) {
    console.error('Employees GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
