export function fmtDate(d: string | null): string {
  if (!d) return ''
  const [y, m, day] = d.split('T')[0].split('-')
  return `${day}/${m}/${y}`
}

export function toInputDate(d: string | null): string {
  if (!d) return ''
  return d.split('T')[0]
}

export function fmtDateTime(d: string | null): string {
  if (!d) return ''
  const [datePart, timePart] = d.split('T')
  const [y, m, day] = datePart.split('-')
  const [h, min] = (timePart || '').split(':')
  return `${day}/${m}/${y} ${h}:${min}`
}
