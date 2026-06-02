'use client'

const STATE_LABELS: Record<string, string> = {
  Comprado: 'Comprado',
  Logistica: 'Logística',
  Taller: 'Taller',
  Chapa: 'Chapa y Pintura',
  Preparacion: 'Preparación',
  Listo: 'Listo para venta',
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
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2">
      {columns.map((col, idx) => (
        <div
          key={col.state}
          className="pipeline-column p-3 animate-fade-up"
          style={{ animationDelay: `${idx * 60}ms` }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">{STATE_ICONS[col.state]}</span>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {STATE_LABELS[col.state]}
              </h3>
            </div>
            <span className="pill" style={{ color: 'var(--text-secondary)' }}>
              {col.vehicles.length}
            </span>
          </div>

          <div className="space-y-1.5 min-h-[60px]">
            {col.vehicles.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Vacío</p>
            ) : (
              col.vehicles.map((v, i) => (
                <div
                  key={v.id}
                  className="vehicle-card animate-slide-in"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {v.name || 'Sin nombre'}
                  </p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {v.brand} · {v.matricula || '—'}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
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
