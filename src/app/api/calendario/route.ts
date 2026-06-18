import { NextResponse } from 'next/server'
import { getTasks } from '@/lib/notion/tasks'
import { getWorkshopOrders } from '@/lib/notion/workshop'
import { getCalendarEvents } from '@/lib/notion/calendar'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [tasks, workshops, events] = await Promise.all([
      getTasks(),
      getWorkshopOrders(),
      getCalendarEvents(),
    ])

    const items = [
      ...tasks.map(t => ({
        id: t.id,
        titulo: t.name,
        fecha: t.deadline,
        tipo: 'tarea' as const,
        estado: t.state,
        area: (t as any).area || '',
        responsableId: t.responsibleIds[0] || null,
        vehicleId: t.vehicleId,
        prioridad: t.priority,
      })),
      ...workshops.map(w => ({
        id: w.id,
        titulo: w.nombre,
        fecha: w.fechaEntrada,
        tipo: 'taller' as const,
        estado: w.estado,
        area: w.tipo,
        responsableId: w.responsableId,
        vehicleId: w.vehicleId,
        prioridad: null as string | null,
      })),
      ...events.map(e => ({
        id: e.id,
        titulo: e.nombre,
        fecha: e.fechaInicio,
        tipo: 'evento' as const,
        estado: e.estado,
        area: e.area,
        responsableId: e.responsableId,
        vehicleId: e.vehicleId,
        prioridad: null as string | null,
      })),
    ].filter(item => item.fecha)

    return NextResponse.json({
      success: true,
      data: {
        items,
        tasksCount: tasks.length,
        workshopsCount: workshops.length,
        eventsCount: events.length,
      },
    })
  } catch (error: any) {
    console.error('Calendario GET error:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch calendario' },
      { status: 500 }
    )
  }
}
