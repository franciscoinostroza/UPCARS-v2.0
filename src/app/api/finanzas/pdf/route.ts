import { NextResponse } from 'next/server'
import { getFinanzas } from '@/lib/notion/finanzas'
import { getVehicles } from '@/lib/notion/vehicles'

export const dynamic = 'force-dynamic'

function lines(text: string): string[] {
  return text.split('\n')
}

export async function GET() {
  try {
    const [records, vehicles] = await Promise.all([
      getFinanzas(),
      getVehicles(),
    ])

    const sold = vehicles.filter(v => v.state === 'Vendido')
    const margenPositivo = sold.filter(v => (v.margenBruto ?? 0) > 0).reduce((s, v) => s + (v.margenBruto ?? 0), 0)
    const margenNegativo = Math.abs(sold.filter(v => (v.margenBruto ?? 0) < 0).reduce((s, v) => s + (v.margenBruto ?? 0), 0))

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Reporte Financiero - UPCARS</title>
<style>
  @page { size: auto; margin: 10mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; padding: 30px; }
  h1 { font-size: 20px; margin-bottom: 5px; }
  h2 { font-size: 14px; margin-top: 20px; margin-bottom: 8px; color: #555; }
  .kpis { display: flex; gap: 15px; margin: 15px 0; }
  .kpi { background: #f5f5f5; padding: 10px 15px; border-radius: 6px; flex: 1; }
  .kpi .label { font-size: 10px; color: #888; }
  .kpi .value { font-size: 16px; font-weight: bold; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: 11px; }
  th { background: #f0f0f0; font-weight: 600; }
  .green { color: #22c55e; }
  .red { color: #ef4444; }
  .right { text-align: right; }
  .footer { margin-top: 30px; font-size: 10px; color: #aaa; }
</style></head><body>
<h1>💰 Finanzas - UPCARS</h1>
<p style="color:#888;font-size:11px">Generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`

    html += `<div class="kpis">
      <div class="kpi"><div class="label">Ganancias</div><div class="value green">${margenPositivo.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
      <div class="kpi"><div class="label">Pérdidas</div><div class="value red">${margenNegativo.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
      <div class="kpi"><div class="label">Balance</div><div class="value" style="color:${(margenPositivo - margenNegativo) >= 0 ? '#22c55e' : '#ef4444'}">${(margenPositivo - margenNegativo).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</div></div>
      <div class="kpi"><div class="label">Vehículos vendidos</div><div class="value">${sold.length}</div></div>
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

    if (records.length > 0) {
      html += `<h2>📋 Todos los registros</h2><table>
        <tr><th>Concepto</th><th>Tipo</th><th>Categoría</th><th class="right">Importe</th><th class="right">Fecha</th></tr>
        ${records.map(r => `<tr><td>${r.concepto || '-'}</td><td style="color:${r.tipo === 'Ingreso' ? '#22c55e' : '#ef4444'}">${r.tipo}</td><td>${r.categoria || '-'}</td><td class="right" style="color:${r.tipo === 'Ingreso' ? '#22c55e' : '#ef4444'}">${(r.importe || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td><td class="right">${r.fecha || '-'}</td></tr>`).join('')}
      </table>`
    }

    html += `<div class="footer">Generado por UPCARS - upcars.pixelarch.dev</div>
<script>window.print()</script></body></html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    console.error('Finanzas PDF error:', error)
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 })
  }
}
