import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'UPCARS Automation Engine v2',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
