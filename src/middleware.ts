import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const referer = request.headers.get('referer') || ''
  const token = request.nextUrl.searchParams.get('token')
  const path = request.nextUrl.pathname

  // Resources always allowed
  if (path.startsWith('/_next/') || path.startsWith('/favicon')) return NextResponse.next()

  // Cron endpoints (protected by CRON_SECRET internally)
  if (path.startsWith('/api/cron/')) return NextResponse.next()

  // Setup endpoints (migration, debug - one-time use)
  if (path.startsWith('/api/setup/')) return NextResponse.next()

  // Sync endpoint (called from Notion webhook / button)
  if (path.startsWith('/api/sync/')) return NextResponse.next()

  const embedToken = process.env.EMBED_TOKEN
  const fromNotion = referer.includes('notion.so')
  const fromApp = referer.includes('pixelarch.dev') || referer.includes('vercel.app')
  const validToken = token === embedToken

  if (fromNotion || fromApp || validToken) return NextResponse.next()

  return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|.*\\.).*)'],
}
