'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThemeProvider, useTheme } from '../dashboard/theme-context'
import { DarkModeToggle } from '../dashboard/dark-mode'
import { Skeleton } from '@/components/skeleton'

interface VehicleItem {
  id: string
  name: string
  matricula: string
  brand: string
  state: string
}

interface EmployeeItem {
  id: string
  name: string
  role: string
  department: string
}

const VALID_NEXT: Record<string, string[]> = {
  Comprado: ['En logística'],
  'En logística': ['En taller', 'En chapa'],
  'En taller': ['En chapa', 'En preparación'],
  'En chapa': ['En taller', 'En preparación'],
  'En preparación': ['Listo para venta'],
  'Listo para venta': [],
}

const STATE_LABELS: Record<string, string> = {
  Comprado: 'Comprado', 'En logística': 'Logística', 'En taller': 'Taller',
  'En chapa': 'Chapa y Pintura', 'En preparación': 'Preparación', 'Listo para venta': 'Listo para venta', 'Vendido': 'Vendido',
}

type ModalType = 'nuevo' | 'mover' | 'asignar' | 'orden' | 'vender' | 'task' | null

function BotonesInner() {
  const { dark } = useTheme()
  const [modal, setModal] = useState<ModalType>(null)
  const [vehicles, setVehicles] = useState<VehicleItem[]>([])
  const [employees, setEmployees] = useState<EmployeeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const showToast = (msg: string, error?: boolean) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    try {
      const [vRes, eRes] = await Promise.all([
        fetch('/api/vehicles?list=true'),
        fetch('/api/employees'),
      ])
      const vData = await vRes.json()
      const eData = await eRes.json()
      if (vData.success) setVehicles(vData.data)
      if (eData.success) setEmployees(eData.data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="max-w-lg mx-auto p-4 sm:p-6">

        <div className="flex items-center justify-between mb-5 animate-fade-up">
          <h1 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text)' }}>🎛️ Panel de control</h1>
          <DarkModeToggle />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
            {[1,2,3,4,5,6].map((i) => (
              <Skeleton key={i} style={{ height: 90 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { key: 'nuevo' as ModalType, icon: '➕', label: 'Nuevo vehículo', desc: 'Crear en Notion' },
                { key: 'mover' as ModalType, icon: '🚀', label: 'Mover vehículo', desc: 'Cambiar estado' },
                { key: 'asignar' as ModalType, icon: '👤', label: 'Asignar responsable', desc: 'Vehículo → empleado' },
                { key: 'orden' as ModalType, icon: '📋', label: 'Nueva orden taller', desc: 'Taller / Chapa / Prep / Log' },
                { key: 'vender' as ModalType, icon: '🏷️', label: 'Marcar como Vendido', desc: 'Desde Listo para venta' },
                { key: 'task' as ModalType, icon: '📝', label: 'Crear tarea rápida', desc: 'En Tareas del Equipo' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setModal(btn.key)}
                  className="card p-3 sm:p-4 text-left min-h-[80px] sm:min-h-[90px] transition-all duration-150 cursor-pointer"
                  style={{ background: 'var(--bg-card)', color: 'var(--text)' }}
                >
                  <span className="text-lg sm:text-xl">{btn.icon}</span>
                  <p className="text-xs sm:text-sm font-semibold mt-1">{btn.label}</p>
                  <p className="text-[10px] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>{btn.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/cron/sync')
                    showToast('Sync forzado ✓')
                  } catch { showToast('Error en sync', true) }
                }}
                className="card flex-1 text-center text-xs sm:text-sm font-medium px-3 py-2.5 min-h-[44px]"
                style={{ color: 'var(--text)' }}
              >
                🔄 Forzar sync
              </button>

              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/kpis')
                    const data = await res.json()
                    const ids = data.data?.activeAlerts?.map((a: any) => a.id) || []
                    await Promise.all(ids.map((id: string) =>
                      fetch(`/api/alerts/${id}`, { method: 'PATCH' })
                    ))
                    showToast(`${ids.length} alertas resueltas ✓`)
                  } catch { showToast('Error al resolver', true) }
                }}
                className="card flex-1 text-center text-xs sm:text-sm font-medium px-3 py-2.5 min-h-[44px]"
                style={{ color: 'var(--text)' }}
              >
                ✅ Resolver alertas
              </button>
            </div>
          </>
        )}


      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div
            className="card px-4 py-2 text-sm font-medium"
            style={{
              color: 'var(--text)',
              background: toast.error ? 'rgba(235, 87, 87, 0.15)' : 'var(--bg-card)',
              border: toast.error ? '1px solid var(--accent-red)' : undefined,
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {modal === 'nuevo' && (
        <Modal onClose={() => setModal(null)} title="➕ Nuevo vehículo">
          <NuevoVehiculoForm
            onSuccess={() => { setModal(null); showToast('Vehículo creado ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
      {modal === 'mover' && (
        <Modal onClose={() => setModal(null)} title="🚀 Mover vehículo">
          <MoverVehiculoForm
            vehicles={vehicles}
            onSuccess={() => { setModal(null); showToast('Vehículo movido ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
      {modal === 'asignar' && (
        <Modal onClose={() => setModal(null)} title="👤 Asignar responsable">
          <AsignarForm
            vehicles={vehicles} employees={employees}
            onSuccess={() => { setModal(null); showToast('Responsable asignado ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
      {modal === 'orden' && (
        <Modal onClose={() => setModal(null)} title="📋 Nueva orden taller">
          <OrdenForm
            vehicles={vehicles}
            employees={employees}
            onSuccess={() => { setModal(null); showToast('Orden creada ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
      {modal === 'vender' && (
        <Modal onClose={() => setModal(null)} title="🏷️ Marcar como Vendido">
          <VenderForm
            vehicles={vehicles}
            onSuccess={() => { setModal(null); showToast('Vehículo marcado como Vendido ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
      {modal === 'task' && (
        <Modal onClose={() => setModal(null)} title="📝 Crear tarea rápida">
          <TaskForm
            vehicles={vehicles}
            employees={employees}
            onSuccess={() => { setModal(null); showToast('Tarea creada ✓'); fetchData() }}
            onError={(msg) => showToast(msg, true)}
          />
        </Modal>
      )}
    </div>
  )
}

export default function BotonesPage() {
  return (
    <ThemeProvider>
      <BotonesInner />
    </ThemeProvider>
  )
}

/* ─── Modal ─── */

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card w-full max-w-md animate-fade-up flex flex-col"
        style={{ background: 'var(--bg-card)', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded" style={{ color: 'var(--text-muted)' }}>
            ✕
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/* ─── Form: Nuevo vehículo ─── */

function NuevoVehiculoForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [lineaNegocio, setLineaNegocio] = useState('')
  const [tipo, setTipo] = useState('')
  const [color, setColor] = useState('')
  const [combustible, setCombustible] = useState('')
  const [kilometraje, setKilometraje] = useState('')
  const [notas, setNotas] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [fechaListo, setFechaListo] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [saving, setSaving] = useState(false)

  const COMBUSTIBLES = ['Gasolina', 'Diesel', 'Hibrido (ECO)', 'PHEV', 'Electrico']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { name: name.trim() }
      if (brand.trim()) body.brand = brand.trim()
      if (model.trim()) body.model = model.trim()
      if (year.trim()) body.year = parseInt(year)
      if (lineaNegocio.trim()) body.lineaNegocio = lineaNegocio.trim()
      if (tipo.trim()) body.tipo = tipo.trim()
      if (color.trim()) body.color = color.trim()
      if (combustible) body.combustible = combustible
      if (kilometraje.trim()) body.kilometrajeEntrada = parseInt(kilometraje)
      if (notas.trim()) body.notas = notas.trim()
      if (fechaCompra) body.fechaCompra = fechaCompra
      if (fechaListo) body.fechaListo = fechaListo
      if (precioCompra.trim()) body.precioCompra = parseFloat(precioCompra)
      if (precioVenta.trim()) body.precioVenta = parseFloat(precioVenta)

      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) onSuccess()
      else onError(data.error || 'Error al crear vehículo')
    } catch (err: any) {
      onError(err?.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Matrícula *" value={name} onChange={setName} required />
      <Input label="Año" value={year} onChange={setYear} inputMode="numeric" />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Marca" value={brand} onChange={setBrand} />
        <Input label="Modelo" value={model} onChange={setModel} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Color" value={color} onChange={setColor} />
        <Select label="Combustible" value={combustible} onChange={setCombustible}
          options={[{ value: '', label: 'Seleccionar...' }, ...COMBUSTIBLES.map(c => ({ value: c, label: c }))]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Kilometraje entrada" value={kilometraje} onChange={setKilometraje} inputMode="numeric" />
        <Input label="Línea de negocio" value={lineaNegocio} onChange={setLineaNegocio} />
      </div>
      <Input label="Tipo de vehículo" value={tipo} onChange={setTipo} />
      <div className="grid grid-cols-2 gap-2">
        <Input label="Fecha de compra" value={fechaCompra} onChange={setFechaCompra} type="date" />
        <Input label="Fecha listo para venta" value={fechaListo} onChange={setFechaListo} type="date" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Precio de compra (€)" value={precioCompra} onChange={setPrecioCompra} inputMode="decimal" />
        <Input label="Precio de venta (€)" value={precioVenta} onChange={setPrecioVenta} inputMode="decimal" />
      </div>
      <Input label="Notas" value={notas} onChange={setNotas} textarea />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full text-sm font-semibold py-2.5 rounded min-h-[44px] transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        {saving ? 'Creando...' : 'Crear vehículo'}
      </button>
    </form>
  )
}

/* ─── Form: Mover vehículo ─── */

function MoverVehiculoForm({ vehicles, onSuccess, onError }: { vehicles: VehicleItem[]; onSuccess: () => void; onError: (msg: string) => void }) {
  const [vehicleId, setVehicleId] = useState('')
  const [toState, setToState] = useState('')
  const [saving, setSaving] = useState(false)

  const vehicle = vehicles.find((v) => v.id === vehicleId)
  const availableStates = vehicle ? VALID_NEXT[vehicle.state] || [] : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicleId || !toState) return
    setSaving(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: toState }),
      })
      const data = await res.json()
      if (res.ok) onSuccess()
      else onError(data.error || 'Error al mover')
    } catch (err: any) {
      onError(err?.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select
        label="Vehículo" value={vehicleId} onChange={(v) => { setVehicleId(v); setToState('') }}
        options={vehicles.map((v) => ({ value: v.id, label: `${v.matricula ? `${v.matricula} - ${v.brand} ${v.model} (${v.year || '—'})`.trim() : v.name} — ${STATE_LABELS[v.state] || v.state}` }))}
      />
      {vehicle && (
        <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}>
          Estado actual: <strong style={{ color: 'var(--text)' }}>{STATE_LABELS[vehicle.state] || vehicle.state}</strong>
        </div>
      )}
      {availableStates.length > 0 ? (
        <Select
          label="Mover a" value={toState} onChange={setToState}
          options={availableStates.map((s) => ({ value: s, label: STATE_LABELS[s] || s }))}
        />
      ) : (
        vehicle && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Este vehículo no puede avanzar a más estados.</p>
      )}
      <button
        type="submit"
        disabled={saving || !vehicleId || !toState}
        className="w-full text-sm font-semibold py-2.5 rounded min-h-[44px] transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        {saving ? 'Moviendo...' : 'Mover vehículo'}
      </button>
    </form>
  )
}

/* ─── Form: Asignar responsable ─── */

function AsignarForm({ vehicles, employees, onSuccess, onError }: { vehicles: VehicleItem[]; employees: EmployeeItem[]; onSuccess: () => void; onError: (msg: string) => void }) {
  const [vehicleId, setVehicleId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicleId || !employeeId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId }),
      })
      const data = await res.json()
      if (res.ok) onSuccess()
      else onError(data.error || 'Error al asignar')
    } catch (err: any) {
      onError(err?.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select
        label="Vehículo" value={vehicleId} onChange={setVehicleId}
        options={vehicles.map((v) => ({ value: v.id, label: v.matricula ? `${v.matricula} - ${v.brand} ${v.model} (${v.year || '—'})`.trim() : v.name }))}
      />
      <Select
        label="Responsable" value={employeeId} onChange={setEmployeeId}
        options={employees.map((e) => ({ value: e.id, label: `${e.name} — ${e.role}` }))}
      />
      <button
        type="submit"
        disabled={saving || !vehicleId || !employeeId}
        className="w-full text-sm font-semibold py-2.5 rounded min-h-[44px] transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        {saving ? 'Asignando...' : 'Asignar responsable'}
      </button>
    </form>
  )
}

/* ─── Form: Nueva orden taller ─── */

function OrdenForm({ vehicles, employees, onSuccess, onError }: { vehicles: VehicleItem[]; employees: EmployeeItem[]; onSuccess: () => void; onError: (msg: string) => void }) {
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState('')
  const [tipoTrabajo, setTipoTrabajo] = useState('')
  const [mecanicoId, setMecanicoId] = useState('')
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [costeMateriales, setCosteMateriales] = useState('')
  const [costeManoObra, setCosteManoObra] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const TIPOS_TRABAJO = ['Revisión general', 'Frenos', 'Motor', 'Electricidad', 'Otro']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicleId || !type) return
    setSaving(true)
    try {
      const res = await fetch('/api/workshop-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, vehicleId,
          tipoTrabajo: tipoTrabajo || undefined,
          mecanicoId: mecanicoId || undefined,
          fechaEntrada: fechaEntrada || undefined,
          costeMateriales: costeMateriales ? parseFloat(costeMateriales) : undefined,
          costeManoObra: costeManoObra ? parseFloat(costeManoObra) : undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) onSuccess()
      else onError(data.error || 'Error al crear orden')
    } catch (err: any) {
      onError(err?.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Select label="Vehículo" value={vehicleId} onChange={setVehicleId}
        options={vehicles.map(v => ({ value: v.id, label: v.matricula ? `${v.matricula} - ${v.brand} ${v.model} (${v.year || '—'})`.trim() : v.name }))}
      />
      {vehicleId && (
        <div className="text-xs px-2 py-1.5 rounded" style={{ background: 'var(--bg-pill)', color: 'var(--text-secondary)' }}>
          Estado actual: <strong style={{ color: 'var(--text)' }}>Listo para venta</strong>
        </div>
      )}
      <button
        type="submit"
        disabled={saving || !vehicleId || listos.length === 0}
        className="w-full text-sm font-semibold py-2.5 rounded min-h-[44px] transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        {saving ? 'Marcando...' : '🏷️ Marcar como Vendido'}
      </button>
    </form>
  )
}

/* ─── Form: Crear tarea rápida ─── */

function TaskForm({ vehicles, employees, onSuccess, onError }: { vehicles: VehicleItem[]; employees: EmployeeItem[]; onSuccess: () => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [area, setArea] = useState('')
  const [priority, setPriority] = useState('Media')
  const [type, setType] = useState('')
  const [tipoTarea, setTipoTarea] = useState('')
  const [areaNegocio, setAreaNegocio] = useState('')
  const [responsableId, setResponsableId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [saving, setSaving] = useState(false)

  const AREAS = ['Taller', 'Logística', 'Marketing', 'Ventas', 'Gerencia', 'Administración']
  const TIPOS = ['Personal', 'Grupal', 'Departamental', 'Proyecto']
  const TIPOS_TAREA = ['Mejora interna', 'Marketing', 'Nuevo negocio', 'Visitas', 'Administrativo', 'Otro']
  const AREAS_NEGOCIO = ['Taller', 'V.O', 'Renting', 'Marketing', 'Growth', 'General', 'RRHH']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !area) return
    setSaving(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          area,
          priority,
          vehicleId: vehicleId || null,
          type: type || undefined,
          tipoTarea: tipoTarea || undefined,
          areaNegocio: areaNegocio || undefined,
          responsableId: responsableId || undefined,
          deadline: deadline || undefined,
          descripcion: descripcion.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) onSuccess()
      else onError(data.error || 'Error al crear tarea')
    } catch (err: any) {
      onError(err?.message || 'Error de red')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input label="Nombre de la tarea *" value={name} onChange={setName} required />
      <div className="grid grid-cols-2 gap-2">
        <Select label="Departamento *" value={area} onChange={setArea}
          options={AREAS.map(a => ({ value: a, label: a }))}
        />
        <Select label="Prioridad" value={priority} onChange={setPriority}
          options={[
            { value: 'Media', label: '🟡 Media' },
            { value: 'Alta', label: '🔴 Alta' },
            { value: 'Baja', label: '🟢 Baja' },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select label="Tipo" value={type} onChange={setType}
          options={[{ value: '', label: 'Seleccionar...' }, ...TIPOS.map(t => ({ value: t, label: t }))]}
        />
        <Select label="Tipo de tarea" value={tipoTarea} onChange={setTipoTarea}
          options={[{ value: '', label: 'Seleccionar...' }, ...TIPOS_TAREA.map(t => ({ value: t, label: t }))]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select label="Área de negocio" value={areaNegocio} onChange={setAreaNegocio}
          options={[{ value: '', label: 'Seleccionar...' }, ...AREAS_NEGOCIO.map(a => ({ value: a, label: a }))]}
        />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Fecha límite</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded outline-none"
            style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
          />
        </div>
      </div>
      <Select label="Responsable" value={responsableId} onChange={setResponsableId}
        options={[{ value: '', label: 'Seleccionar...' }, ...employees.map(e => ({ value: e.id, label: e.name }))]}
      />
      <Select label="Vehículo" value={vehicleId} onChange={setVehicleId}
        options={[{ value: '', label: 'Seleccionar...' }, ...vehicles.map(v => ({ value: v.id, label: v.matricula ? `${v.matricula} - ${v.brand} ${v.model} (${v.year || '—'})`.trim() : v.name }))]}
      />
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Descripción</label>
        <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
          className="w-full text-sm px-3 py-2 rounded outline-none resize-none"
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      </div>
      <button
        type="submit"
        disabled={saving || !name.trim() || !area}
        className="w-full text-sm font-semibold py-2.5 rounded min-h-[44px] transition-opacity disabled:opacity-40"
        style={{ background: 'var(--accent-blue)', color: '#fff' }}
      >
        {saving ? 'Creando...' : '📝 Crear tarea'}
      </button>
    </form>
  )
}

/* ─── UI helpers ─── */

function Input({ label, value, onChange, required, type, inputMode, textarea }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean; type?: string; inputMode?: string; textarea?: boolean
}) {
  if (textarea) {
    return (
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full text-sm px-3 py-2 rounded outline-none resize-none"
          style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
        />
      </div>
    )
  }
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type={type || 'text'}
        inputMode={(inputMode || 'text') as any}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full text-sm px-3 py-2 rounded outline-none"
        style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
      />
    </div>
  )
}

function Select({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 rounded outline-none appearance-none"
        style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
