import { NextRequest, NextResponse } from 'next/server'
import { uploadAuthFile } from '@/lib/supabase/storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ success: false, error: 'file required' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadAuthFile(buffer, file.name, file.type)

    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    console.error('Logística upload error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
