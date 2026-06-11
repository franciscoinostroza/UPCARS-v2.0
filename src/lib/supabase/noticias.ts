import { supabase } from './client'

const db = () => supabase() as any

export async function marcarVisto(noticiaId: string, empleadoId: string): Promise<void> {
  const { error } = await db()
    .from('noticias_vistos')
    .upsert(
      { noticia_id: noticiaId, empleado_id: empleadoId, visto_at: new Date().toISOString() },
      { onConflict: 'noticia_id,empleado_id' }
    )
  if (error) throw error
}

export async function getVistos(noticiaId: string): Promise<{ empleado_id: string; visto_at: string }[]> {
  const { data } = await db()
    .from('noticias_vistos')
    .select('empleado_id, visto_at')
    .eq('noticia_id', noticiaId)
  return (data || []) as { empleado_id: string; visto_at: string }[]
}

export async function getNoticiasVistas(empleadoId: string): Promise<string[]> {
  const { data } = await db()
    .from('noticias_vistos')
    .select('noticia_id')
    .eq('empleado_id', empleadoId)
  return (data || []).map((r: any) => r.noticia_id)
}
