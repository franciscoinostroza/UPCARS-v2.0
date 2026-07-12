import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface DBEntry {
  key: string
  name: string
  icon: string
  desc: string
  url: string
  webUrl: string
  embedUrl?: string
  category: 'Operaciones' | 'Movimiento' | 'Gestión'
}

const DB_META: Record<string, { name: string; icon: string; desc: string; category: DBEntry['category']; viewId?: string; pageId?: string }> = {
  vehicles: { name: 'Vehículos', icon: '🚗', desc: 'Base principal de vehículos', category: 'Operaciones', viewId: '36cf70f8470180d9beae000c38931b70' },
  workshop: { name: 'Taller', icon: '🔧', desc: 'Órdenes de taller mecánico', category: 'Operaciones', pageId: '398f70f84701807ca12ad6a08c83be03' },
  chapa: { name: 'Chapa y Pintura', icon: '🎨', desc: 'Trabajos de chapa y pintura', category: 'Operaciones', pageId: '398f70f847018062adabf1b015444a94' },
  preparacion: { name: 'Preparación', icon: '✨', desc: 'Preparación previa a venta', category: 'Operaciones', pageId: '398f70f84701801382c8e96333ab4226' },
  logistics: { name: 'Logística', icon: '🚛', desc: 'Transporte y logística', category: 'Operaciones', pageId: '397f70f8470180c28157c96bbd17b99a' },
  tasks: { name: 'Tareas', icon: '📋', desc: 'Tareas operativas del equipo', category: 'Operaciones' },
  ventas: { name: 'Ventas', icon: '💰', desc: 'Registro de ventas', category: 'Movimiento' },
  calendario_operativo: { name: 'Calendario Operativo', icon: '📅', desc: 'Planificación operativa', category: 'Movimiento' },
  calendario_rrhh: { name: 'Calendario RRHH', icon: '👤', desc: 'Gestión de turnos y ausencias', category: 'Movimiento' },
  reviews: { name: 'Reviews Google', icon: '⭐', desc: 'Reseñas y reputación online', category: 'Movimiento' },
  marketing: { name: 'Marketing', icon: '📢', desc: 'Campañas y contenido', category: 'Movimiento' },
  employees: { name: 'Empleados', icon: '👥', desc: 'Plantilla y responsables', category: 'Gestión' },
  providers: { name: 'Proveedores', icon: '🏭', desc: 'Empresas proveedoras', category: 'Gestión' },
  financieras: { name: 'Financieras', icon: '🏦', desc: 'Entidades financieras', category: 'Gestión' },
  operaciones_financiadas: { name: 'Op. Financiadas', icon: '💳', desc: 'Operaciones con financiación', category: 'Gestión' },
  finanzas: { name: 'Finanzas', icon: '📊', desc: 'Control financiero', category: 'Gestión' },
  buzon_mejora: { name: 'Buzón Mejoras', icon: '💡', desc: 'Propuestas de mejora', category: 'Gestión' },
}

const ENV_KEYS: Record<string, string> = {
  vehicles: 'VEHICLES_DB_ID',
  employees: 'EMPLOYEES_DB_ID',
  workshop: 'WORKSHOP_DB_ID',
  chapa: 'CHAPA_DB_ID',
  preparacion: 'PREPARACION_DB_ID',
  logistics: 'LOGISTICS_DB_ID',
  tasks: 'TASKS_DB_ID',
  ventas: 'VENTAS_DB_ID',
  calendario_operativo: 'CALENDARIO_OPERATIVO_DB_ID',
  calendario_rrhh: 'CALENDARIO_RRHH_DB_ID',
  marketing: 'MARKETING_DB_ID',
  reviews: 'GOOGLE_REVIEWS_DB_ID',
  providers: 'PROVIDERS_DB_ID',
  financieras: 'FINANCIERAS_DB_ID',
  operaciones_financiadas: 'OPERACIONES_FINANCIADAS_DB_ID',
  finanzas: 'FINANZAS_DB_ID',
  buzon_mejora: 'BUZON_MEJORA_DB_ID',
}

export async function GET() {
  const dbs: DBEntry[] = []

  for (const [key, meta] of Object.entries(DB_META)) {
    const envKey = ENV_KEYS[key]
    let id = process.env[envKey]

    if (!id && key === 'calendario_operativo') {
      id = process.env.CALENDARIO_DB_ID
    }

    if (!id) continue

    const rawId = (meta.pageId || id).replace(/-/g, '')
    const url = `notion://notion.so/${rawId}`
    const params = meta.viewId ? `?v=${meta.viewId}` : ''
    const webUrl = `https://app.notion.com/p/${rawId}${params}`
    const domain = process.env.NOTION_EMBED_DOMAIN
    const embedUrl = domain && meta.viewId
      ? `https://${domain}.notion.site/ebd/${rawId}?v=${meta.viewId}`
      : undefined

    dbs.push({
      key,
      name: meta.name,
      icon: meta.icon,
      desc: meta.desc,
      url,
      webUrl,
      embedUrl,
      category: meta.category,
    })
  }

  return NextResponse.json({ success: true, data: dbs })
}
