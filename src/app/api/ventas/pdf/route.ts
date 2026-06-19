import { NextResponse } from 'next/server'
import { getVentas } from '@/lib/notion/ventas'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [ventas, vehicles] = await Promise.all([
      getVentas(),
      getVehicles(),
    ])

    const sold = vehicles.filter(v => v.state === 'Vendido')
    const totalRevenue = sold.reduce((s, v) => s + (v.precioVenta ?? 0), 0)
    const totalMargin = sold.reduce((s, v) => s + (v.margenBruto ?? 0), 0)

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ventas - UPCARS</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 30px; }
  h1 { font-size: 20px; margin-bottom: 5px; }
  h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; color: #555; }
  .kpis { display: flex; gap: 15px; margin: 15px 0; flex-wrap: wrap; }
  .kpi { background: #f5f5f5; padding: 10px 15px; border-radius: 6px; min-width: 120px; }
  .kpi .label { font-size: 10px; color: #888; }
  .kpi .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: 11px; }
  th { background: #f0f0f0; font-weight: 600; }
  .right { text-align: right; }
  .footer { margin-top: 30px; font-size: 10px; color: #aaa; }
</style></head><body>
<h1>💰 Ventas - UPCARS</h1>
<p style="color:#888;font-size:11px">Generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`

    html += `<div class="kpis">
      <div class="kpi"><div class="label">Vendidos</div><div class="value">${sold.length}</div></div>
      <div class="kpi"><div class="label">Ingreso total</div><div class="value">${totalRevenue.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
      <div class="kpi"><div class="label">Margen total</div><div class="value">${totalMargin.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
    </div>`

    const margenes = sold
      .filter(v => v.margenBruto != null)
      .map(v => ({ name: v.name, margen: v.margenBruto! }))
      .sort((a, b) => b.margen - a.margen)

    if (margenes.length > 0) {
      html += `<h2>🚗 Margen por vehículo</h2><table>
        <tr><th>Vehículo</th><th class="right">Margen</th></tr>
        ${margenes.map(v => `<tr><td>${v.name}</td><td class="right" style="color:${v.margen >= 0 ? '#22c55e' : '#ef4444'}">${v.margen.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td></tr>`).join('')}
      </table>`
    }

    if (ventas.length > 0) {
      html += `<h2>📋 Ventas registradas</h2><table>
        <tr><th>Venta</th><th class="right">Precio</th><th class="right">Margen</th><th class="right">Fecha</th></tr>
        ${ventas.map(v => `<tr><td>${v.nombre}</td><td class="right">${(v.precioVenta || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td><td class="right" style="color:${(v.margenBruto || 0) >= 0 ? '#22c55e' : '#ef4444'}">${(v.margenBruto || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td><td class="right">${v.fechaVenta || '-'}</td></tr>`).join('')}
      </table>`
    }

    html += `<div class="footer">Generado por UPCARS - upcars.pixelarch.dev</div></body></html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': 'attachment; filename="ventas-upcars.html"',
      },
    })
  } catch (error: any) {
    console.error('Ventas PDF error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
