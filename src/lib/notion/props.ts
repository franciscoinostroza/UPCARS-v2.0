import { VehicleState } from '@/lib/types'

type NotionProp = Record<string, unknown>

function tv(p: NotionProp | undefined, fallback = ''): string {
  return (p?.title as any[])?.[0]?.plain_text ?? fallback
}
function rtv(p: NotionProp | undefined, fallback = ''): string {
  return (p?.rich_text as any[])?.[0]?.plain_text ?? fallback
}
function num(p: NotionProp | undefined, fallback: number | null = null): number | null {
  return (p?.number as number) ?? fallback
}
function sel(p: NotionProp | undefined, fallback = ''): string {
  return (p?.select as any)?.name ?? (p?.status as any)?.name ?? fallback
}
function rel(p: NotionProp | undefined, fallback: string | null = null): string | null {
  return (p?.relation as any[])?.[0]?.id ?? fallback
}
function dateVal(p: NotionProp | undefined, fallback: string | null = null): string | null {
  return (p?.date as any)?.start ?? fallback
}
function relAll(p: NotionProp | undefined): string[] {
  return (p?.relation as any[])?.map((r: any) => r.id) ?? []
}
function formulaNum(p: NotionProp | undefined, fallback: number | null = null): number | null {
  return (p?.formula as any)?.number ?? (p?.formula as any)?.value ?? fallback
}
function filesVal(p: NotionProp | undefined, fallback = ''): string {
  return (p?.files as any[])?.[0]?.file?.url ?? (p?.files as any[])?.[0]?.name ?? fallback
}

interface PropIndex {
  title: string[]
  rich_text: string[]
  select: string[]
  status: string[]
  number: string[]
  date: string[]
  relation: string[]
  formula: string[]
}

function indexByType(p: Record<string, NotionProp>): PropIndex {
  const idx: PropIndex = { title: [], rich_text: [], select: [], status: [], number: [], date: [], relation: [], formula: [] }
  for (const key of Object.keys(p)) {
    const type = (p[key] as any)?.type as string
    if (idx[type as keyof PropIndex]) idx[type as keyof PropIndex].push(key)
  }
  return idx
}

function matchKey(keys: string[], candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (keys.includes(c)) return c
  }
  return undefined
}

export function parseVehicleProps(id: string, p: Record<string, NotionProp>) {
  const idx = indexByType(p)

  const nameKey = idx.title[0]

  const selectKeys = idx.select
  const statusKey = matchKey(selectKeys, ['Estado Actual', 'Estado']) ?? selectKeys[0]

  const richTextKeys = idx.rich_text
  const matriculaKey = matchKey(richTextKeys, ['Matricula / VIN', 'Matrícula', 'Matricula']) ?? richTextKeys[0]
  const brandKey = matchKey(richTextKeys, ['Marca', 'Brand']) ?? richTextKeys[1]
  const modelKey = matchKey(richTextKeys, ['Modelo', 'Model']) ?? richTextKeys[2]
  const colorKey = matchKey(richTextKeys, ['Color']) ?? richTextKeys[3]
  const notasKey = matchKey(richTextKeys, ['Notas']) ?? richTextKeys[richTextKeys.length - 1]

  const combustibleKey = matchKey(selectKeys, ['Combustible']) ?? selectKeys[0]
  const lineaNegocioKey = matchKey(selectKeys, ['Línea de Negocio', 'Línea de negocio', 'Linea de negocio']) ?? selectKeys[1]
  const tipoKey = matchKey(selectKeys, ['Tipo de vehículos', 'Tipo de vehículo', 'Tipo', 'Tipo de vehiculo']) ?? selectKeys[2]

  const dateKeys = idx.date
  const fechaCompraKey = matchKey(dateKeys, ['Fecha de compra', 'Fecha compra']) ?? dateKeys[0]
  const fechaEntradaTallerKey = matchKey(dateKeys, ['Fecha entrada taller']) ?? dateKeys[1]
  const fechaEntradaPreparacionKey = matchKey(dateKeys, ['Fecha entrada preparación']) ?? dateKeys[2]
  const fechaListoKey = matchKey(dateKeys, ['Fecha listo para venta', 'Fecha listo']) ?? dateKeys[3]
  const fechaVendidoKey = matchKey(dateKeys, ['Fecha de venta', 'Fecha venta']) ?? dateKeys[4]

  const numberKeys = idx.number
  const yearKey = matchKey(numberKeys, ['Año', 'Year', 'Ano']) ?? numberKeys[0]
  const kilometrajeEntradaKey = matchKey(numberKeys, ['Kilometraje entrada']) ?? numberKeys[1]
  const precioCompraKey = matchKey(numberKeys, ['Precio de compra (€)', 'Precio compra', 'Precio de compra']) ?? numberKeys[2]
  const precioVentaKey = matchKey(numberKeys, ['Precio venta (€)', 'Precio de venta (€)', 'Precio venta', 'Precio de venta']) ?? numberKeys[3]

  const relationKeys = idx.relation
  const responsableKey = matchKey(relationKeys, ['Responsable Actual', 'Responsable']) ?? relationKeys[0]

  const formulaKeys = idx.formula
  const tiempoTotalKey = matchKey(formulaKeys, ['Tiempo total (días)', 'Tiempo total']) ?? formulaKeys[0]
  const diasActivoKey = matchKey(formulaKeys, ['Días activo sin cerrar']) ?? formulaKeys[1]
  const margenBrutoKey = matchKey(formulaKeys, ['Margen bruto (€)', 'Margen bruto']) ?? formulaKeys[2]

  return {
    id,
    name: tv(nameKey ? p[nameKey] : undefined),
    matricula: rtv(matriculaKey ? p[matriculaKey] : undefined),
    brand: rtv(brandKey ? p[brandKey] : undefined),
    model: rtv(modelKey ? p[modelKey] : undefined),
    year: num(yearKey ? p[yearKey] : undefined, 0)!,
    lineaNegocio: sel(lineaNegocioKey ? p[lineaNegocioKey] : undefined),
    tipo: sel(tipoKey ? p[tipoKey] : undefined),
    state: sel(statusKey ? p[statusKey] : undefined, 'Comprado') as VehicleState,
    fechaCompra: dateVal(fechaCompraKey ? p[fechaCompraKey] : undefined, '')!,
    fechaListo: dateVal(fechaListoKey ? p[fechaListoKey] : undefined),
    fechaVendido: dateVal(fechaVendidoKey ? p[fechaVendidoKey] : undefined),
    responsable: rel(responsableKey ? p[responsableKey] : undefined),
    precioCompra: num(precioCompraKey ? p[precioCompraKey] : undefined),
    precioVenta: num(precioVentaKey ? p[precioVentaKey] : undefined),
    combustible: sel(combustibleKey ? p[combustibleKey] : undefined),
    color: rtv(colorKey ? p[colorKey] : undefined),
    kilometrajeEntrada: num(kilometrajeEntradaKey ? p[kilometrajeEntradaKey] : undefined),
    fechaEntradaTaller: dateVal(fechaEntradaTallerKey ? p[fechaEntradaTallerKey] : undefined),
    fechaEntradaPreparacion: dateVal(fechaEntradaPreparacionKey ? p[fechaEntradaPreparacionKey] : undefined),
    notas: rtv(notasKey ? p[notasKey] : undefined),
    tiempoTotalDias: formulaNum(tiempoTotalKey ? p[tiempoTotalKey] : undefined),
    diasActivoSinCerrar: formulaNum(diasActivoKey ? p[diasActivoKey] : undefined),
    margenBruto: formulaNum(margenBrutoKey ? p[margenBrutoKey] : undefined),
  }
}

export function parseEmployeeProps(id: string, p: Record<string, NotionProp>) {
  const idx = indexByType(p)
  const nameKey = idx.title[0]
  const selectKeys = idx.select
  const roleKey = matchKey(selectKeys, ['Cargo', 'Rol / Puesto', 'Rol', 'Role', 'Puesto']) ?? selectKeys[1]
  const deptKey = matchKey(selectKeys, ['Departamento', 'Department']) ?? selectKeys[2]
  const statusKey = matchKey(selectKeys, ['Estado', 'Estado Actual']) ?? selectKeys[0]
  const emailKey = Object.keys(p).find(k => (p[k] as any)?.type === 'email') || 'Email'

  return {
    id,
    name: tv(nameKey ? p[nameKey] : undefined),
    email: (p[emailKey] as any)?.email ?? '',
    role: sel(roleKey ? p[roleKey] : undefined),
    department: sel(deptKey ? p[deptKey] : undefined),
    active: sel(statusKey ? p[statusKey] : undefined) === 'Activo',
  }
}

export function parseTaskProps(id: string, p: Record<string, NotionProp>) {
  const idx = indexByType(p)
  const nameKey = idx.title[0]
  const selectKeys = idx.select
  const relationKeys = idx.relation
  const dateKeys = idx.date

  const statusKey = matchKey(selectKeys, ['Estado']) ?? selectKeys[0]
  const priorityKey = matchKey(selectKeys, ['Prioridad']) ?? selectKeys[1]
  const deptKey = matchKey(selectKeys, ['Departamento', 'Department']) ?? selectKeys[2]
  const typeKey = matchKey(selectKeys, ['Tipo', 'Type']) ?? selectKeys[3]
  const vehicleRelKey = relationKeys.find((k) => k.includes('Vehículo')) ?? relationKeys[0]
  const responsibleRelKey = matchKey(relationKeys, ['Responsable']) ?? relationKeys[1]
  const deadlineKey = matchKey(dateKeys, ['Fecha límite', 'Fecha limite', 'Deadline', 'Fecha de vencimiento']) ?? dateKeys[0]

  return {
    id,
    name: tv(nameKey ? p[nameKey] : undefined),
    vehicleId: rel(vehicleRelKey ? p[vehicleRelKey] : undefined),
    responsibleIds: relAll(responsibleRelKey ? p[responsibleRelKey] : undefined),
    priority: sel(priorityKey ? p[priorityKey] : undefined, 'Media') as 'Alta' | 'Media' | 'Baja',
    state: sel(statusKey ? p[statusKey] : undefined, 'Sin empezar') as 'Sin empezar' | 'En progreso' | 'Bloqueada' | 'Completada' | 'Cancelada',
    deadline: dateVal(deadlineKey ? p[deadlineKey] : undefined),
    area: sel(deptKey ? p[deptKey] : undefined),
    type: sel(typeKey ? p[typeKey] : undefined),
  }
}
