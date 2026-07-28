import { supabase } from './client'

const BUCKET = 'logistica-auth'

function extractPathFromUrl(url: string): string | null {
  const prefix = `/object/public/${BUCKET}/`
  const idx = url.indexOf(prefix)
  if (idx === -1) return null
  return url.slice(idx + prefix.length)
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export async function uploadAuthFile(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; path: string; name: string }> {
  const ext = fileName.split('.').pop() || 'bin'
  const path = `${uid()}.${ext}`

  const { error } = await supabase().storage.from(BUCKET).upload(path, file, {
    contentType: mimeType,
    upsert: false,
  })
  if (error?.message?.toLowerCase().includes('bucket') || error?.message?.includes('not found')) {
    await supabase().storage.createBucket(BUCKET, { public: true })
    const { error: retryError } = await supabase().storage.from(BUCKET).upload(path, file, {
      contentType: mimeType,
      upsert: false,
    })
    if (retryError) throw new Error(`Supabase upload failed: ${retryError.message}`)
  } else if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase().storage.from(BUCKET).getPublicUrl(path)
  return { url: urlData.publicUrl, path, name: fileName }
}

export async function deleteAuthFile(url: string): Promise<void> {
  const path = extractPathFromUrl(url)
  if (!path) return
  await supabase().storage.from(BUCKET).remove([path])
}

export async function deleteAuthFileByPath(path: string): Promise<void> {
  await supabase().storage.from(BUCKET).remove([path])
}
