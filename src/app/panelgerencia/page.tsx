'use client'

import { ThemeProvider } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import Link from 'next/link'

interface PanelItem {
  id: string
  name: string
  icon: string
  desc: string
  path: string
}

const ITEMS: PanelItem[] = [
  { id: 'kpis', name: 'KPIs Operativos', icon: '📊', desc: 'Pipeline, SLA, alertas, rendimiento del equipo', path: '/dashboard' },
  { id: 'ventas', name: 'Ventas', icon: '💰', desc: 'Autos vendidos, precios, márgenes, empleados', path: '/ventas' },
  { id: 'finanzas', name: 'Finanzas', icon: '💶', desc: 'Márgenes por vehículo, ganancias, pérdidas, balance', path: '/finanzas' },
  { id: 'calendario', name: 'Calendario', icon: '📅', desc: 'Tareas, taller y eventos operativos', path: '/calendario' },
]

function PanelInner() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>📋 Panel de Gerencia</h1>
          <DarkModeToggle />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              className="card p-4 sm:p-5 block transition-all duration-150 hover:opacity-80"
              style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
            >
              <span className="text-2xl sm:text-3xl block mb-2">{item.icon}</span>
              <p className="text-sm sm:text-base font-semibold mb-1">{item.name}</p>
              <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              <p className="text-[10px] mt-2" style={{ color: 'var(--accent-blue)' }}>
                Abrir →
              </p>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}

export default function PanelPage() {
  return (
    <ThemeProvider>
      <PanelInner />
    </ThemeProvider>
  )
}
