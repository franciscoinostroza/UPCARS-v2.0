import { NextRequest, NextResponse } from 'next/server'
import { archiveNoticia } from '@/lib/notion/noticias'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await archiveNoticia(id)
    return NextResponse.json({ success: true, data: { id } })
  } catch (error: any) {
    console.error('Noticia DELETE error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to archive noticia' },
      { status: 500 }
    )
  }
}
