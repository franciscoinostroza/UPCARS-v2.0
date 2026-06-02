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

import { VehicleState } from '@/lib/types'

export function parseVehicleProps(id: string, p: Record<string, NotionProp>) {
  return {
    id,
    name: tv(p['Nombre'] || p['Name']),
    matricula: rtv(p['Matrícula'] || p['Matricula']),
    brand: rtv(p['Marca'] || p['Brand']),
    model: rtv(p['Modelo'] || p['Model']),
    year: num(p['Año'] || p['Year'], 0)!,
    lineaNegocio: sel(p['Línea de negocio'] || p['Linea de negocio']),
    tipo: sel(p['Tipo de vehículo'] || p['Tipo']),
    state: sel(p['Estado actual'] || p['Status'], 'Comprado') as VehicleState,
    fechaCompra: dateVal(p['Fecha de compra'] || p['Fecha compra'], '')!,
    fechaListo: dateVal(p['Fecha listo para venta'] || p['Fecha listo']),
    responsable: rel(p['Responsable actual'] || p['Responsable']),
    precioCompra: num(p['Precio de compra (€)'] || p['Precio compra']),
    precioVenta: num(p['Precio de venta (€)'] || p['Precio venta']),
    costeTotal: formulaNum(p['Coste total acumulado'] || p['Coste total']),
  }
}

export function parseEmployeeProps(id: string, p: Record<string, NotionProp>) {
  return {
    id,
    name: tv(p['Nombre completo'] || p['Name']),
    role: sel(p['Rol / Puesto'] || p['Role']),
    department: sel(p['Departamento'] || p['Department']),
    active: (p['Estado'] as any)?.status?.name === 'Activo' || (p['Estado'] as any)?.select?.name === 'Activo',
  }
}
