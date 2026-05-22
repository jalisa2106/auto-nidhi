import { Search, Plus } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
}

interface Props<T extends Record<string, any>> {
  columns: Column<T>[]
  rows: T[]
  searchKeys?: (keyof T)[]
  onAdd?: () => void
  addLabel?: string
  rightSlot?: ReactNode
  empty?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns, rows, searchKeys, onAdd, addLabel = 'Add new', rightSlot, empty = 'No records',
}: Props<T>) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    if (!q || !searchKeys?.length) return rows
    const t = q.toLowerCase()
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(t)))
  }, [q, rows, searchKeys])

  return (
    <div className="data-card">
      <div className="data-toolbar">
        {searchKeys?.length ? (
          <div className="data-search">
            <Search size={15} />
            <input placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        ) : <div />}
        <div style={{ display: 'flex', gap: 8 }}>
          {rightSlot}
          {onAdd && (
            <button className="btn btn-primary btn-sm" onClick={onAdd}>
              <Plus size={14} /> {addLabel}
            </button>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="data-empty">{empty}</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>{columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={String(c.key)}>{c.render ? c.render(r) : String(r[c.key as keyof T] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
