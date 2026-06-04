import { notionPost, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'

export async function createTask(
  name: string,
  vehicleId: string | null,
  responsibleIds: string[] = [],
  priority: 'Alta' | 'Media' | 'Baja' = 'Media',
  area: string = ''
) {
  const dbId = getDatabaseId('tasks')
  const schema = await getDbSchema('tasks')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre de la tarea'
  const relationProps = findPropertiesByType(schema, 'relation')
  const selectProps = findPropertiesByType(schema, 'select')

  function findSelect(candidates: string[], fallbackIdx: number): string {
    for (const c of candidates) {
      const found = selectProps.find((s) => s.name === c)
      if (found) return found.name
    }
    const fallback = selectProps[fallbackIdx]
    return fallback?.name || candidates[0] || selectProps[0]?.name || 'Estado'
  }

  const statusKey = findSelect(['Estado'], 0)
  const priorityKey = findSelect(['Prioridad'], 1)
  const deptKey = findSelect(['Departamento', 'Department'], 2)
  const typeKey = findSelect(['Tipo', 'Type'], 3)
  const vehicleRelKey = relationProps?.find((r) => r.name === 'Vehículo relacionado' || r.name.includes('Vehículo'))?.name || relationProps[0]?.name
  const responsibleRelKey = relationProps?.find((r) => r.name === 'Responsable')?.name || relationProps[1]?.name

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: name } }] },
    [priorityKey]: { select: { name: priority } },
    [statusKey]: { select: { name: 'Sin empezar' } },
    [typeKey]: { select: { name: 'Departamental' } },
  }

  if (area) {
    properties[deptKey] = { select: { name: area } }
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
