'use client'

const STATE_LABELS: Record<string, string> = {
  Comprado: 'Comprado',
  Logistica: 'Logística',
  Taller: 'Taller',
  Chapa: 'Chapa y Pintura',
  Preparacion: 'Preparación',
  Listo: 'Listo para venta',
}

const STATE_COLORS: Record<string, string> = {
  Comprado: 'border-l-blue-400',
  Logistica: 'border-l-orange-400',
  Taller: 'border-l-yellow-400',
  Chapa: 'border-l-purple-400',
  Preparacion: 'border-l-green-400',
  Listo: 'border-l-emerald-400',
}

const STATE_ICONS: Record<string, string> = {
  Comprado: '📋',
  Logistica: '🚛',
  Taller: '🔧',
  Chapa: '🎨',
  Preparacion: '✨',
  Listo: '✅',
}

interface PipelineVehicle {
  id: string
  name: string
  matricula: string
  brand: string
  daysInState: number
}

interface PipelineColumn {
  state: string
  vehicles: PipelineVehicle[]
}

export default function Pipeline({ columns }: { columns: PipelineColumn[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
      {columns.map((col, idx) => (
        <div
          key={col.state}
          className="pipeline-column p-4 animate-fade-up"
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{STATE_ICONS[col.state]}</span>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {STATE_LABELS[col.state]}
              </h3>
            </div>
            <span className="text-xs font-bold text-[var(--accent-blue)] bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
              {col.vehicles.length}
            </span>
          </div>

          <div className="space-y-2 min-h-[80px]">
            {col.vehicles.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic text-center pt-4">
                Vacío
              </p>
            ) : (
              col.vehicles.map((v, i) => (
                <div
                  key={v.id}
                  className={`vehicle-card animate-slide-in ${STATE_COLORS[col.state]} border-l-2`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <p className="text-sm font-semibold text-[var(--text)] truncate">
                    {v.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-[var(--text-muted)]">
                      {v.brand} · {v.matricula}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {v.daysInState > 0 ? `${v.daysInState}d` : 'hoy'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
