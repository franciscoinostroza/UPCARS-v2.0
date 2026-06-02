import { notionPost, getDatabaseId } from './client'

export async function createTask(
  name: string,
  vehicleId: string | null,
  responsibleIds: string[],
  priority: 'Alta' | 'Media' | 'Baja',
  area: string
) {
  const dbId = getDatabaseId('tasks')

  const properties: Record<string, unknown> = {
    'Nombre de la tarea': { title: [{ text: { content: name } }] },
    'Prioridad': { select: { name: priority } },
    'Estado': { status: { name: 'Sin empezar' } },
    'Departamento': { select: { name: area } },
    'Tipo': { select: { name: 'Departamental' } },
  }

  if (vehicleId) {
    properties['Vehículo relacionado'] = { relation: [{ id: vehicleId }] }
  }

  if (responsibleIds.length > 0) {
    properties['Responsable(s)'] = { relation: responsibleIds.map((id) => ({ id })) }
  }

  await notionPost(`/pages`, {
    parent: { database_id: dbId },
    properties,
  })
}
