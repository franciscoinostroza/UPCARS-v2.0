import { NextRequest, NextResponse } from 'next/server'
import { notionGet, notionPatch } from '@/lib/notion/client'

export const dynamic = 'force-dynamic'

const VEHICLE_DATE_MAP: Record<string, string> = {
  'Fecha programada': 'F. E. Logística',
  'Fecha entrada taller': 'F. E taller',
  'Fecha salida': 'F. E. Chapista',
  'Fecha inicio': 'F. E. preparación (Limpieza)',
  'Fecha de venta': 'Fecha de venta',
}

const AREA_DATA: Record<string, { label: string; sourceDateFields: string[] }> = {
  logistica: { label: 'Logística', sourceDateFields: ['Fecha programada'] },
  taller: { label: 'Taller', sourceDateFields: ['Fecha entrada taller'] },
  chapa: { label: 'Chapa y Pintura', sourceDateFields: ['Fecha salida'] },
  preparacion: { label: 'Preparación', sourceDateFields: ['Fecha inicio'] },
  ventas: { label: 'Ventas', sourceDateFields: ['Fecha de venta'] },
}

function extractRelation(props: any, key: string): string | null {
  return props[key]?.relation?.[0]?.id ?? null
}

function extractDate(props: any, key: string): string | null {
  return props[key]?.date?.start ?? null
}

function extractNumber(props: any, key: string): number | null {
  return props[key]?.number ?? null
}

function extractText(props: any, key: string): string {
  return props[key]?.rich_text?.[0]?.plain_text ?? ''
}

function extractSelect(props: any, key: string): string {
  return props[key]?.select?.name ?? ''
}

async function getProperties(request: NextRequest, area: string): Promise<{ props: any; recordId: string | null }> {
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get('recordId')

  if (recordId) {
    // GET mode: read the page directly from Notion
    const page: any = await notionGet(`/pages/${recordId}`)
    return { props: page.properties || {}, recordId }
  }

  // POST mode: extract from request body
  const body = await request.json()

  // Notion automation webhook format: { source, data: { properties } }
  if (body?.data?.properties) {
    return { props: body.data.properties, recordId: body.data.id || null }
  }

  // Simple format: direct properties
  return { props: body, recordId: null }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ area: string }> }
) {
  return handleRequest(request, await params)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ area: string }> }
) {
  return handleRequest(request, await params)
}

async function handleRequest(request: NextRequest, { area }: { area: string }) {
  try {
    const config = AREA_DATA[area]
    if (!config) {
      return NextResponse.json({ success: false, error: `Unknown area: ${area}` }, { status: 400 })
    }

    const { props } = await getProperties(request, area)

    const vehicleId = extractRelation(props, 'Vehículo')
    if (!vehicleId) {
      return NextResponse.json({ success: true, message: 'Skipped - no vehicle linked' })
    }

    const updateProps: Record<string, any> = {}

    for (const sourceField of config.sourceDateFields) {
      const dateVal = extractDate(props, sourceField)
      if (dateVal) {
        const targetKey = VEHICLE_DATE_MAP[sourceField]
        if (targetKey) {
          updateProps[targetKey] = { date: { start: dateVal } }
        }
      }
    }

    const responsableKeys: Record<string, string> = {
      logistica: 'Responsable',
      taller: 'Mecánico asignado',
      preparacion: 'Preparador',
      ventas: 'Vendedor',
    }
    if (responsableKeys[area]) {
      const respId = extractRelation(props, responsableKeys[area])
      if (respId) {
        updateProps['Responsable Actual'] = { relation: [{ id: respId }] }
      }
    }

    if (area === 'logistica') {
      const ubicacion = extractText(props, 'UBICACION')
      if (ubicacion) updateProps['Ubicación'] = { select: { name: ubicacion } }
    }

    if (area === 'ventas') {
      const precio = extractNumber(props, 'Precio de venta (€)')
      if (precio != null) updateProps['Precio venta (€)'] = { number: precio }
    }

    const observaciones = extractText(props, 'Observaciones')
    const trabajos = area === 'chapa' ? extractText(props, 'Trabajos solicitados') : ''

    // ─── Taller data ───
    const tallerData = area === 'taller' ? {
      tipoTrabajo: extractSelect(props, 'Tipo de trabajo'),
      estado: extractSelect(props, 'Estado'),
      fechaSalida: extractDate(props, 'Fecha salida taller'),
      costeMateriales: extractNumber(props, 'Coste materiales (€)'),
      costeManoObra: extractNumber(props, 'Coste mano de obra (€)'),
      diasTaller: props['Días en taller']?.formula?.number,
      costeTotal: props['Coste total']?.formula?.number,
    } : null

    // ─── Chapa data ───
    const chapaData = area === 'chapa' ? {
      estado: extractSelect(props, 'Estado'),
      fechaRetorno: extractDate(props, 'Fecha retorno'),
      diasFuera: props['Días fuera']?.formula?.number,
      costeTotal: extractNumber(props, 'Coste total (€)'),
      proveedorId: extractRelation(props, 'Proveedor externo'),
    } : null
    let proveedorNombre = ''
    if (chapaData?.proveedorId) {
      try {
        const provData: any = await notionGet(`/pages/${chapaData.proveedorId}`)
        proveedorNombre = provData.properties?.['Nombre Empresa']?.title?.[0]?.plain_text ?? ''
      } catch {}
    }

    // ─── Preparación data ───
    const preparacionCheckboxes = ['Limpieza exterior', 'Limpieza interior', 'Fotografía para anuncio']
    const preparacionData = area === 'preparacion' ? {
      estado: extractSelect(props, 'Estado'),
      fechaEntrega: extractDate(props, 'fecha de entrega'),
      fechaFin: extractDate(props, 'Fecha fin'),
      registrarInicio: props['Registrar inicio']?.checkbox,
      registrarFin: props['registrar fin']?.checkbox,
      tipoLimpieza: extractSelect(props, 'Tipo de limpieza'),
      horasInvertidas: props['Horas invertidas']?.formula?.number,
    } : null

    // ─── Logística data ───
    const logisticaData = area === 'logistica' ? {
      estado: extractSelect(props, 'Estado'),
      fechaRealizada: extractDate(props, 'Fecha realizada'),
      authFileName: props['Autorización de retirada ']?.files?.[0]?.name ?? null,
    } : null

    // ─── Ventas data ───
    let financieraNombre = ''
    const financieraId = area === 'ventas' ? extractRelation(props, 'Financiera') : null
    if (financieraId) {
      try {
        const finData: any = await notionGet(`/pages/${financieraId}`)
        const titleKey = Object.keys(finData.properties).find(k => finData.properties[k]?.type === 'title') || ''
        financieraNombre = titleKey ? (finData.properties[titleKey]?.title?.[0]?.plain_text ?? '') : ''
      } catch {}
    }
    const ventasData = area === 'ventas' ? {
      cliente: extractText(props, 'Cliente nombre'),
      contacto: extractText(props, 'Cliente contacto'),
      formaPago: extractSelect(props, 'Forma de pago'),
      financiada: props['Financiada']?.checkbox,
      margenBruto: props['Margen bruto (€)']?.formula?.number,
      precioCompra: props['Precio de compra (€)']?.rollup?.number,
    } : null

    const tallerExtra = tallerData && (tallerData.tipoTrabajo || tallerData.estado || tallerData.fechaSalida || tallerData.costeMateriales != null || tallerData.costeManoObra != null || tallerData.diasTaller != null || tallerData.costeTotal != null)
    const chapaExtra = chapaData && (chapaData.estado || chapaData.fechaRetorno || chapaData.diasFuera != null || chapaData.costeTotal != null || proveedorNombre)
    const preparacionExtra = preparacionData && (preparacionData.estado || preparacionData.fechaEntrega || preparacionData.fechaFin || preparacionData.registrarInicio || preparacionData.registrarFin || preparacionData.tipoLimpieza || preparacionData.horasInvertidas != null)
    const logisticaExtra = logisticaData && (logisticaData.estado || logisticaData.fechaRealizada || logisticaData.authFileName)
    const ventasExtra = ventasData && (ventasData.cliente || ventasData.formaPago || ventasData.financiada || financieraNombre || ventasData.margenBruto != null || ventasData.precioCompra != null)
    const extraNotas = observaciones || trabajos || tallerExtra || chapaExtra || preparacionExtra || logisticaExtra || ventasExtra
    if (extraNotas) {
      let existingNotas = ''
      try {
        const vehicle: any = await notionGet(`/pages/${vehicleId}`)
        existingNotas = vehicle.properties?.Notas?.rich_text?.[0]?.plain_text ?? ''
      } catch {}
      const parts: string[] = []
      if (trabajos) parts.push(`Trabajos: ${trabajos}`)

      // ── Taller ──
      if (area === 'taller' && tallerData) {
        if (tallerData.tipoTrabajo) parts.push(`Tipo de trabajo: ${tallerData.tipoTrabajo}`)
        if (tallerData.estado) parts.push(`Estado: ${tallerData.estado}`)
        if (tallerData.fechaSalida) parts.push(`Fecha salida: ${tallerData.fechaSalida}`)
        if (tallerData.costeMateriales != null) parts.push(`Coste materiales: ${tallerData.costeMateriales}€`)
        if (tallerData.costeManoObra != null) parts.push(`Coste mano de obra: ${tallerData.costeManoObra}€`)
        if (tallerData.costeTotal != null) parts.push(`Coste total: ${tallerData.costeTotal}€`)
        if (tallerData.diasTaller != null) parts.push(`Días en taller: ${tallerData.diasTaller}`)
      }

      // ── Chapa ──
      if (area === 'chapa' && chapaData) {
        if (proveedorNombre) parts.push(`Proveedor: ${proveedorNombre}`)
        if (chapaData.estado) parts.push(`Estado: ${chapaData.estado}`)
        if (chapaData.fechaRetorno) parts.push(`Fecha retorno: ${chapaData.fechaRetorno}`)
        if (chapaData.diasFuera != null) parts.push(`Días fuera: ${chapaData.diasFuera}`)
        if (chapaData.costeTotal != null) parts.push(`Coste total: ${chapaData.costeTotal}€`)
      }

      // ── Preparación ──
      if (area === 'preparacion' && preparacionData) {
        if (preparacionData.tipoLimpieza) parts.push(`Tipo de limpieza: ${preparacionData.tipoLimpieza}`)
        if (preparacionData.estado) parts.push(`Estado: ${preparacionData.estado}`)
        if (preparacionData.fechaEntrega) parts.push(`Fecha entrega: ${preparacionData.fechaEntrega}`)
        if (preparacionData.fechaFin) parts.push(`Fecha fin: ${preparacionData.fechaFin}`)
        if (preparacionData.horasInvertidas != null) parts.push(`Horas invertidas: ${preparacionData.horasInvertidas}`)
        if (preparacionData.registrarInicio) parts.push(`Registrar inicio: ✅`)
        if (preparacionData.registrarFin) parts.push(`Registrar fin: ✅`)
        for (const cb of preparacionCheckboxes) {
          if (props[cb]?.checkbox) parts.push(`${cb}: ✅`)
        }
      }

      // ── Logística ──
      if (area === 'logistica' && logisticaData) {
        if (logisticaData.estado) parts.push(`Estado: ${logisticaData.estado}`)
        if (logisticaData.fechaRealizada) parts.push(`Fecha realizada: ${logisticaData.fechaRealizada}`)
        if (logisticaData.authFileName) parts.push(`Autorización: ${logisticaData.authFileName}`)
      }

      // ── Ventas ──
      if (ventasData) {
        if (ventasData.cliente) parts.push(`Cliente: ${ventasData.cliente}`)
        if (ventasData.contacto) parts.push(`Contacto: ${ventasData.contacto}`)
        if (ventasData.formaPago) parts.push(`Forma de pago: ${ventasData.formaPago}`)
        if (ventasData.financiada) parts.push(`Financiada: ✅`)
        if (financieraNombre) parts.push(`Financiera: ${financieraNombre}`)
        if (ventasData.margenBruto != null) parts.push(`Margen bruto: ${ventasData.margenBruto}€`)
        if (ventasData.precioCompra != null) parts.push(`Precio compra: ${ventasData.precioCompra}€`)
      }

      if (observaciones) parts.push(`Observaciones: ${observaciones}`)
      const blockHeader = `--- ${config.label} ---`
      const newBlock = `\n${blockHeader}\n${parts.join('\n')}`
      const escaped = blockHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`\\n${escaped}[\\s\\S]*?(?=\\n---|$)`)
      const updatedNotas = regex.test(existingNotas)
        ? existingNotas.replace(regex, newBlock)
        : existingNotas + newBlock
      updateProps['Notas'] = { rich_text: [{ text: { content: updatedNotas } }] }
    }

    if (Object.keys(updateProps).length === 0) {
      return NextResponse.json({ success: true, message: 'Nothing to update' })
    }

    await notionPatch(`/pages/${vehicleId}`, { properties: updateProps })
    return NextResponse.json({ success: true, area, updated: Object.keys(updateProps) })
  } catch (error: any) {
    console.error('Sync from-area error:', error)
    return NextResponse.json({ success: false, error: error?.message || 'Sync failed' }, { status: 500 })
  }
}
