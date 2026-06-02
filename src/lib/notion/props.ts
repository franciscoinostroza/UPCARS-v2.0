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
function formulaNum(p: NotionProp | undefined, fallback: number | null = null): number | null {
  return (p?.formula as any)?.number ?? (p?.formula as any)?.value ?? fallback
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
  const statusKey = idx.status[0]

  const richTextKeys = idx.rich_text
  const matriculaKey = matchKey(richTextKeys, ['Matrícula', 'Matricula']) ?? richTextKeys[0]
  const brandKey = matchKey(richTextKeys, ['Marca', 'Brand']) ?? richTextKeys[1]
  const modelKey = matchKey(richTextKeys, ['Modelo', 'Model']) ?? richTextKeys[2]

  const selectKeys = idx.select
  const lineaNegocioKey = matchKey(selectKeys, ['Línea de negocio', 'Linea de negocio', 'Linea de negocio']) ?? selectKeys[0]
  const tipoKey = matchKey(selectKeys, ['Tipo de vehículo', 'Tipo', 'Tipo de vehiculo']) ?? selectKeys[1]

  const dateKeys = idx.date
  const fechaCompraKey = matchKey(dateKeys, ['Fecha de compra', 'Fecha compra', 'Fecha de compra']) ?? dateKeys[0]
  const fechaListoKey = matchKey(dateKeys, ['Fecha listo para venta', 'Fecha listo']) ?? dateKeys[1]

  const numberKeys = idx.number
  const yearKey = matchKey(numberKeys, ['Año', 'Year', 'Ano']) ?? numberKeys[0]
  const precioCompraKey = matchKey(numberKeys, ['Precio de compra (€)', 'Precio compra', 'Precio de compra']) ?? numberKeys[1]
  const precioVentaKey = matchKey(numberKeys, ['Precio de venta (€)', 'Precio venta', 'Precio de venta']) ?? numberKeys[2]

  const relationKeys = idx.relation
  const responsableKey = relationKeys[0]

  const formulaKeys = idx.formula
  const costeKey = formulaKeys[0]

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
    responsable: rel(responsableKey ? p[responsableKey] : undefined),
    precioCompra: num(precioCompraKey ? p[precioCompraKey] : undefined),
    precioVenta: num(precioVentaKey ? p[precioVentaKey] : undefined),
    costeTotal: formulaNum(costeKey ? p[costeKey] : undefined),
  }
}

export function parseEmployeeProps(id: string, p: Record<string, NotionProp>) {
  const idx = indexByType(p)
  const nameKey = idx.title[0]
  const selectKeys = idx.select
  const roleKey = matchKey(selectKeys, ['Rol / Puesto', 'Rol', 'Role', 'Puesto']) ?? selectKeys[0]
  const deptKey = matchKey(selectKeys, ['Departamento', 'Department']) ?? selectKeys[1]
  const statusKey = idx.status[0]

  return {
    id,
    name: tv(nameKey ? p[nameKey] : undefined),
    role: sel(roleKey ? p[roleKey] : undefined),
    department: sel(deptKey ? p[deptKey] : undefined),
    active: (statusKey ? (p[statusKey] as any)?.status?.name === 'Activo' : false),
  }
}
