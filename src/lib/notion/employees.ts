import { notionPost, getDatabaseId } from './client'
import { parseEmployeeProps } from './props'
import { Employee } from '@/lib/types'

export async function getEmployees(): Promise<Employee[]> {
  const dbId = getDatabaseId('employees')
  const data: any = await notionPost(`/databases/${dbId}/query`)
  return (data.results || []).map((r: any) => parseEmployeeProps(r.id, r.properties))
}

export async function getEmployeeByRole(role: string): Promise<Employee | null> {
  const employees = await getEmployees()
  return employees.find((e) => e.role === role && e.active) || null
}

export async function getEmployeesByDepartment(dept: string): Promise<Employee[]> {
  const employees = await getEmployees()
  return employees.filter((e) => e.department === dept && e.active)
}

export async function getEmployeesByNames(names: string[]): Promise<Employee[]> {
  const employees = await getEmployees()
  const lower = names.map(n => n.toLowerCase().trim())
  return employees.filter(e => lower.includes(e.name.toLowerCase().trim()) && e.active)
}
