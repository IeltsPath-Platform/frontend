import { useMemo, useState } from 'react'
import type { KnowledgePoint } from '../types'

/** The points that must be learned before this one: a list to search and tick, with how many are ticked. */
export function PrerequisitePicker({ candidates, selected, onChange }: {
  candidates: readonly KnowledgePoint[]
  selected: readonly string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return candidates.filter((point) => !needle || `${point.code} ${point.name}`.toLowerCase().includes(needle))
  }, [candidates, query])
  const toggle = (id: string, on: boolean) => onChange(on ? [...selected, id] : selected.filter((item) => item !== id))

  return <fieldset className="kg-prereq">
    <legend>Cần học trước<span className="adm-badge kg-prereq__count">{selected.length}</span></legend>
    <input aria-label="Tìm điểm kiến thức tiên quyết" className="adm-input" onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã hoặc tên" type="search" value={query} />
    <ul className="kg-prereq__list">
      {shown.length === 0 ? <li className="adm-muted kg-prereq__empty">Không có điểm nào khớp.</li> : shown.map((point) => <li key={point.id}>
        <label className="adm-check">
          <input checked={selected.includes(point.id)} onChange={(event) => toggle(point.id, event.target.checked)} type="checkbox" />
          <span><code>{point.code}</code> {point.name}</span>
        </label>
      </li>)}
    </ul>
  </fieldset>
}
