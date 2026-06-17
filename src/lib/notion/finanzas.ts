import { notionPost, getDatabaseId } from './client'

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
