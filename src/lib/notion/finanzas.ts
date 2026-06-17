import { notionPost, getDatabaseId, notionPatch } from './client'

export interface FinanzaRecord {
  id: string
  concepto: string
  tipo: string
  categoria: string
  importe: number | null
  fecha: string | null
  lineaNegocio: string
  vehiculoId: string | null
  proveedorId: string | null
  notas: string
}

export interface FinanzasKPIs {
  totalIngresos: number
  totalEgresos: number
  balanceNeto: number
  totalVentas: number
  totalMargen: number
  ingresosPorCategoria: Record<string, number>
  egresosPorCategoria: Record<string, number>
  porMes: Record<string, { ingresos: number; egresos: number }>
  ingresosPorLinea: Record<string, number>
}

function parseFinanzaProps(id: string, p: Record<string, any>): FinanzaRecord {
  return {
    id,
    concepto: p['Concepto']?.title?.[0]?.plain_text ?? '',
    tipo: p['Tipo']?.select?.name ?? '',
    categoria: p['Categoría']?.select?.name ?? '',
    importe: p['Importe (€)']?.number ?? null,
    fecha: p['Fecha']?.date?.start ?? null,
    lineaNegocio: p['Línea de negocio']?.select?.name ?? '',
    vehiculoId: p['Vehículo relacionado']?.relation?.[0]?.id ?? null,
    proveedorId: p['Proveedor']?.relation?.[0]?.id ?? null,
    notas: p['Notas']?.rich_text?.[0]?.plain_text ?? '',
  }
}

export async function getFinanzas(): Promise<FinanzaRecord[]> {
  const dbId = getDatabaseId('finanzas')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    sorts: [{ property: 'Fecha', direction: 'descending' }],
  })
  return (data.results || []).map((r: any) => parseFinanzaProps(r.id, r.properties))
}

export function computeFinanzasKPIs(records: FinanzaRecord[], totalSales: number, totalMargin: number): FinanzasKPIs {
  const kpis: FinanzasKPIs = {
    totalIngresos: 0,
    totalEgresos: 0,
    balanceNeto: 0,
    totalVentas: totalSales,
    totalMargen: totalMargin,
    ingresosPorCategoria: {},
    egresosPorCategoria: {},
    porMes: {},
    ingresosPorLinea: {},
  }

  for (const r of records) {
    if (r.importe == null) continue
    const month = r.fecha ? r.fecha.slice(0, 7) : 'sin-fecha'
    const cat = r.categoria || 'Sin categoría'

    if (r.tipo === 'Ingreso') {
      kpis.totalIngresos += r.importe
      kpis.ingresosPorCategoria[cat] = (kpis.ingresosPorCategoria[cat] || 0) + r.importe
      if (!kpis.porMes[month]) kpis.porMes[month] = { ingresos: 0, egresos: 0 }
      kpis.porMes[month].ingresos += r.importe
    } else if (r.tipo === 'Egreso') {
      kpis.totalEgresos += r.importe
      kpis.egresosPorCategoria[cat] = (kpis.egresosPorCategoria[cat] || 0) + r.importe
      if (!kpis.porMes[month]) kpis.porMes[month] = { ingresos: 0, egresos: 0 }
      kpis.porMes[month].egresos += r.importe
    }
  }

  kpis.balanceNeto = kpis.totalIngresos - kpis.totalEgresos
  return kpis
}

export async function getFinanzasByVehicle(vehicleId: string): Promise<FinanzaRecord[]> {
  const dbId = getDatabaseId('finanzas')
  const data: any = await notionPost(`/databases/${dbId}/query`, {
    filter: {
      property: 'Vehículo relacionado',
      relation: { contains: vehicleId },
    },
  })
  return (data.results || []).map((r: any) => parseFinanzaProps(r.id, r.properties))
}

export async function createFinanzaRecord(data: {
  concepto: string
  tipo: string
  categoria: string
  importe: number
  fecha: string
  vehiculoId?: string
  lineaNegocio?: string
  notas?: string
}) {
  const dbId = getDatabaseId('finanzas')
  const props: Record<string, any> = {
    Concepto: { title: [{ text: { content: data.concepto } }] },
    Tipo: { select: { name: data.tipo } },
    Categoría: { select: { name: data.categoria } },
    'Importe (€)': { number: data.importe },
    Fecha: { date: { start: data.fecha } },
  }
  if (data.vehiculoId) {
    props['Vehículo relacionado'] = { relation: [{ id: data.vehiculoId }] }
  }
  if (data.lineaNegocio) {
    props['Línea de negocio'] = { select: { name: data.lineaNegocio } }
  }
  if (data.notas) {
    props.Notas = { rich_text: [{ text: { content: data.notas } }] }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties: props,
  })
}
