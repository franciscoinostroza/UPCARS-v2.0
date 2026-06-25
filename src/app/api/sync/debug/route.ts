import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let lastBody: any = null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    lastBody = body
    return NextResponse.json({ success: true, received: body })
  } catch (error: any) {
    lastBody = { error: error.message }
    return NextResponse.json({ success: false, error: error.message }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    lastBody,
    note: 'Haz un POST desde la automatización de Notion y vuelve a esta URL para ver los datos recibidos.',
  })
}
