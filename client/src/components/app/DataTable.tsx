import { Search, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'

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
  loading?: boolean
  pageSize?: number
}

export default function DataTable<T extends Record<string, any>>({
  columns, rows, searchKeys, onAdd, addLabel = 'Add new', rightSlot, empty = 'No records', loading = false, pageSize,
}: Props<T>) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    if (!q || !searchKeys?.length) return rows
    const t = q.toLowerCase()
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(t)))
  }, [q, rows, searchKeys])

  const currentPageSize = pageSize && pageSize > 0 ? pageSize : filtered.length
  const pageCount = Math.max(1, Math.ceil(filtered.length / currentPageSize))
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount)
    }
  }, [pageCount, page])

  useEffect(() => {
    setPage(1)
  }, [q, filtered.length])

  const paginatedRows = filtered.slice((page - 1) * currentPageSize, page * currentPageSize)

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
      {loading ? (
        <div className="data-empty">Loading...</div>
      ) : paginatedRows.length === 0 ? (
        <div className="data-empty">{empty}</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>{columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
              {paginatedRows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={String(c.key)}>{c.render ? c.render(r) : String(r[c.key as keyof T] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {pageSize && pageCount > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
                Showing {paginatedRows.length} of {filtered.length} records
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                >
                  Prev
                </button>
                <span style={{ color: 'var(--gray-600)', fontSize: '0.9rem' }}>
                  Page {page} of {pageCount}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                  disabled={page === pageCount}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
