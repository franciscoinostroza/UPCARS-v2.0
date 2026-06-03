import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function formatId(id: string): string {
  const cleaned = id.replace(/-/g, '')
  if (cleaned.length !== 32) return id
  return `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20)}`
}

interface DBEntry {
  key: string
  name: string
  icon: string
  desc: string
  url: string
  category: 'Operaciones' | 'Movimiento' | 'Gestión'
}

const DB_META: Record<string, { name: string; icon: string; desc: string; category: DBEntry['category'] }> = {
  vehicles: { name: 'Vehículos', icon: '🚗', desc: 'Base principal de vehículos', category: 'Operaciones' },
  workshop: { name: 'Taller', icon: '🔧', desc: 'Órdenes de taller mecánico', category: 'Operaciones' },
  chapa: { name: 'Chapa y Pintura', icon: '🎨', desc: 'Trabajos de chapa y pintura', category: 'Operaciones' },
  preparacion: { name: 'Preparación', icon: '✨', desc: 'Preparación previa a venta', category: 'Operaciones' },
  logistics: { name: 'Logística', icon: '🚛', desc: 'Transporte y logística', category: 'Operaciones' },
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

    const url = `https://notion.so/${formatId(id)}`

    dbs.push({
      key,
      name: meta.name,
      icon: meta.icon,
      desc: meta.desc,
      url,
      category: meta.category,
    })
  }

  return NextResponse.json({ success: true, data: dbs })
}
