import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export async function createTask(
  name: string,
  vehicleId: string | null,
  responsibleIds: string[],
  priority: 'Alta' | 'Media' | 'Baja',
  area: string
) {
  const dbId = getDatabaseId('tasks')
  const schema = await getDbSchema('tasks')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre de la tarea'
  const relationProps = findPropertiesByType(schema, 'relation')
  const selectProps = findPropertiesByType(schema, 'select')
  const statusKey = findPropertyByType(schema, 'status') || 'Estado'

  function findSelect(candidates: string[], fallbackIdx: number): string {
    for (const c of candidates) {
      const found = selectProps.find((s) => s.name === c)
      if (found) return found.name
    }
    return selectProps[fallbackIdx]?.name || candidates[0]
  }

  const priorityKey = findSelect(['Prioridad'], 0)
  const deptKey = findSelect(['Departamento', 'Department'], 1)
  const typeKey = findSelect(['Tipo', 'Type'], 2)
  const vehicleRelKey = relationProps[0]?.name || 'Vehículo relacionado'
  const responsibleRelKey = relationProps[1]?.name || 'Responsable(s)'

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: name } }] },
    [priorityKey]: { select: { name: priority } },
    [statusKey]: { status: { name: 'Sin empezar' } },
    [deptKey]: { select: { name: area } },
    [typeKey]: { select: { name: 'Departamental' } },
  }

  if (vehicleId) {
    properties[vehicleRelKey] = { relation: [{ id: vehicleId }] }
  }

  if (responsibleIds.length > 0) {
    properties[responsibleRelKey] = { relation: responsibleIds.map((id) => ({ id })) }
  }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
}
