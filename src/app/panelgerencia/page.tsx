'use client'

import { ThemeProvider } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'

interface PanelItem {
  id: string
  name: string
  icon: string
  desc: string
  notionId: string
}

const ITEMS: PanelItem[] = [
  { id: 'kpis', name: 'KPIs Operativos', icon: '📊', desc: 'Pipeline, SLA, alertas, rendimiento del equipo', notionId: '383f70f8470180f0bc86eef5943f2f61' },
  { id: 'ventas', name: 'Ventas', icon: '💰', desc: 'Autos vendidos, precios, márgenes, empleados', notionId: '384f70f8470181eebc58c3f24814e3e5' },
  { id: 'finanzas', name: 'Finanzas', icon: '💶', desc: 'Márgenes por vehículo, ganancias, pérdidas, balance', notionId: '384f70f8470181e48276c3f67a0d5a73' },
  { id: 'calendario', name: 'Calendario', icon: '📅', desc: 'Tareas, taller y eventos operativos', notionId: '384f70f8470181acbfdedb02a53552a0' },
]

function getNotionUrl(id: string): { web: string; mobile: string } {
  return {
    web: `https://app.notion.com/p/${id}`,
    mobile: `notion://notion.so/${id}`,
  }
}

function PanelInner() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">

        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text)' }}>📋 Panel de Gerencia</h1>
          <DarkModeToggle />
        </div>

        <p className="text-xs sm:text-sm mb-5 animate-fade-up" style={{ color: 'var(--text-muted)' }}>
          Accedé a los paneles principales desde Notion. Cada sección se abre con un embed de nuestras herramientas web.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-up" style={{ animationDelay: '50ms' }}>
          {ITEMS.map((item) => {
            const urls = getNotionUrl(item.notionId)
            const isMobile = typeof navigator !== 'undefined' &&
              /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
            return (
              <a
                key={item.id}
                href={isMobile ? urls.mobile : urls.web}
                target="_blank"
                rel="noopener noreferrer"
                className="card p-4 sm:p-5 block transition-all duration-150 hover:opacity-80"
                style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
              >
                <span className="text-2xl sm:text-3xl block mb-2">{item.icon}</span>
                <p className="text-sm sm:text-base font-semibold mb-1">{item.name}</p>
                <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                <p className="text-[10px] mt-2" style={{ color: 'var(--accent-blue)' }}>
                  {isMobile ? 'Abrir en app →' : 'Abrir en Notion →'}
                </p>
              </a>
            )
          })}
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
