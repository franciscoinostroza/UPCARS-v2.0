import { notionPost, notionPatch, getDatabaseId } from './client'
import { getDbSchema, findPropertyByType, findPropertiesByType } from './schema'
import { parseTaskProps } from './props'
import type { Task } from '@/lib/types'

export async function createTask(data: {
  name: string
  area: string
  priority?: 'Alta' | 'Media' | 'Baja'
  vehicleId?: string | null
  responsibleIds?: string[]
  type?: string
  tipoTarea?: string
  areaNegocio?: string
  deadline?: string
  descripcion?: string
}) {
  const dbId = getDatabaseId('tasks')
  const schema = await getDbSchema('tasks')

  const titleKey = findPropertyByType(schema, 'title') || 'Nombre de la tarea'
  const relationProps = findPropertiesByType(schema, 'relation') || []
  const selectProps = findPropertiesByType(schema, 'select') || []
  const dateProps = findPropertiesByType(schema, 'date') || []
  const richTextProps = findPropertiesByType(schema, 'rich_text') || []

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
  const tipoTareaKey = findSelect(['Tipo de tarea', 'Tipo tarea'], 4)
  const areaNegocioKey = findSelect(['Área de negocio', 'Area de negocio', 'Area negocio'], 5)
  const vehicleRelKey = relationProps.find((r) => r.name.includes('Vehículo'))?.name || relationProps[0]?.name
  const responsibleRelKey = relationProps.find((r) => r.name === 'Responsable')?.name || relationProps[1]?.name
  const deadlineKey = dateProps.find((d) => d.name.includes('Fecha'))?.name || dateProps[0]?.name
  const descKey = richTextProps.find((r) => r.name.includes('Descripción'))?.name || richTextProps[0]?.name

  const properties: Record<string, unknown> = {
    [titleKey]: { title: [{ text: { content: data.name } }] },
    [statusKey]: { select: { name: 'Sin empezar' } },
    [priorityKey]: { select: { name: data.priority || 'Media' } },
    [deptKey]: { select: { name: data.area } },
  }

  if (data.type) properties[typeKey] = { select: { name: data.type } }
  if (data.tipoTarea && tipoTareaKey) properties[tipoTareaKey] = { select: { name: data.tipoTarea } }
  if (data.areaNegocio && areaNegocioKey) properties[areaNegocioKey] = { select: { name: data.areaNegocio } }
  if (data.vehicleId && vehicleRelKey) properties[vehicleRelKey] = { relation: [{ id: data.vehicleId }] }
  if (data.responsibleIds && data.responsibleIds.length > 0 && responsibleRelKey) {
    properties[responsibleRelKey] = { relation: data.responsibleIds.map((id) => ({ id })) }
  }
  if (data.deadline && deadlineKey) properties[deadlineKey] = { date: { start: data.deadline } }
  if (data.descripcion && descKey) properties[descKey] = { rich_text: [{ text: { content: data.descripcion } }] }

  await notionPost('/pages', {
    parent: { database_id: dbId },
    properties,
  })
}

export async function getTasks(): Promise<Task[]> {
  const dbId = getDatabaseId('tasks')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseTaskProps(r.id, r.properties))
}

export async function archiveTask(taskId: string): Promise<void> {
  await notionPatch(`/pages/${taskId}`, {
    archived: true,
  })
}

export async function updateTaskStatus(taskId: string, newStatus: string): Promise<void> {
  const schema = await getDbSchema('tasks')
  const selects = findPropertiesByType(schema, 'select')
  const statusKey = selects.find((s) => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'

  await notionPatch(`/pages/${taskId}`, {
    properties: {
      [statusKey]: { select: { name: newStatus } },
    },
  })
}

export async function updateTask(taskId: string, data: {
  name?: string
  priority?: string
  area?: string
  type?: string
  tipoTarea?: string
  areaNegocio?: string
  responsibleIds?: string[]
  deadline?: string
  descripcion?: string
  state?: string
}): Promise<void> {
  const schema = await getDbSchema('tasks')
  const selectProps = findPropertiesByType(schema, 'select') || []
  const relationProps = findPropertiesByType(schema, 'relation') || []
  const dateProps = findPropertiesByType(schema, 'date') || []
  const richTextProps = findPropertiesByType(schema, 'rich_text') || []

  function findSelect(candidates: string[], fallbackIdx: number): string {
    for (const c of candidates) {
      const found = selectProps.find((s) => s.name === c)
      if (found) return found.name
    }
    return selectProps[fallbackIdx]?.name || candidates[0] || ''
  }

  const props: Record<string, any> = {}
  const titleKey = findPropertyByType(schema, 'title') || 'Nombre de la tarea'
  const statusKey = findSelect(['Estado'], 0)
  const priorityKey = findSelect(['Prioridad'], 1)
  const deptKey = findSelect(['Departamento', 'Department'], 2)
  const typeKey = findSelect(['Tipo', 'Type'], 3)
  const tipoTareaKey = findSelect(['Tipo de tarea', 'Tipo tarea'], 4)
  const areaNegocioKey = findSelect(['Área de negocio', 'Area de negocio', 'Area negocio'], 5)
  const responsibleRelKey = relationProps.find((r) => r.name === 'Responsable')?.name || ''
  const deadlineKey = dateProps.find((d) => d.name.includes('Fecha'))?.name || ''
  const descKey = richTextProps.find((r) => r.name.includes('Descripción'))?.name || ''

  if (data.name) props[titleKey] = { title: [{ text: { content: data.name } }] }
  if (data.priority && priorityKey) props[priorityKey] = { select: { name: data.priority } }
  if (data.area && deptKey) props[deptKey] = { select: { name: data.area } }
  if (data.type && typeKey) props[typeKey] = { select: { name: data.type } }
  if (data.tipoTarea && tipoTareaKey) props[tipoTareaKey] = { select: { name: data.tipoTarea } }
  if (data.areaNegocio && areaNegocioKey) props[areaNegocioKey] = { select: { name: data.areaNegocio } }
  if (data.state && statusKey) props[statusKey] = { select: { name: data.state } }
  if (data.responsibleIds && responsibleRelKey) props[responsibleRelKey] = { relation: data.responsibleIds.map(id => ({ id })) }
  if (data.deadline && deadlineKey) props[deadlineKey] = { date: { start: data.deadline } }
  if (data.descripcion && descKey) props[descKey] = { rich_text: [{ text: { content: data.descripcion } }] }

  if (Object.keys(props).length === 0) return
  await notionPatch(`/pages/${taskId}`, { properties: props })
}
