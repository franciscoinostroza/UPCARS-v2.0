import { getEmployees } from '@/lib/notion/employees'
import { notionPost, getDatabaseId } from '@/lib/notion/client'
import { getDbSchema, findPropertiesByType } from '@/lib/notion/schema'

export async function getEmployeeKPIs() {
  const employees = await getEmployees()
  const active = employees.filter((e) => e.active)

  const dbId = getDatabaseId('tasks')
  const schema = await getDbSchema('tasks')
  const data: any = await notionPost(`/databases/${dbId}/query`)

  const relations = findPropertiesByType(schema, 'relation')
  const selects = findPropertiesByType(schema, 'select')

  const responsableKey = relations.find((r) => r.name === 'Responsable')?.name || relations[0]?.name || 'Responsable'
  const estadoKey = selects.find((s) => s.name === 'Estado')?.name || selects[0]?.name || 'Estado'

  const taskCounts: Record<string, { completed: number; total: number }> = {}

  for (const task of data.results || []) {
    const assignees = task.properties?.[responsableKey]?.relation || []
    const status = task.properties?.[estadoKey]?.select?.name || ''

    for (const assignee of assignees) {
      if (!taskCounts[assignee.id]) {
        taskCounts[assignee.id] = { completed: 0, total: 0 }
      }
      taskCounts[assignee.id].total++
      if (status === 'Completada') taskCounts[assignee.id].completed++
    }
  }

  return active.map((e) => {
    const counts = taskCounts[e.id] || { completed: 0, total: 0 }
    return {
      id: e.id,
      name: e.name,
      role: e.role,
      department: e.department,
      tasksCompleted: counts.completed,
      tasksTotal: counts.total,
      efficiency: counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0,
    }
  })
}
