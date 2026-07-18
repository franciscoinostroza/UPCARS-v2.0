'use client'

import SearchableSelect from './searchable-select'

function vehLabel(v: any): string {
  return v.matricula
    ? `${v.matricula} — ${v.brand} ${v.model} (${v.year || '—'})`
    : v.name || v.id
}

interface VehicleAutocompleteProps {
  vehicles: { id: string; name: string; matricula?: string; brand?: string; model?: string; year?: string | number }[]
  value: string
  onChange: (id: string) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
}

export default function VehicleAutocomplete({
  vehicles, value, onChange, label, placeholder, required, error,
}: VehicleAutocompleteProps) {
  return (
    <SearchableSelect
      items={vehicles}
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      required={required}
      error={error}
      displayFn={vehLabel}
      searchFn={(v, q) => vehLabel(v).toLowerCase().includes(q) || (v.matricula || '').toLowerCase().includes(q)}
    />
  )
}
