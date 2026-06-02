import React, { useState, useMemo, useEffect } from 'react'
import { X, Search } from 'lucide-react'

interface SelectiveExportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  rows: any[]
  getRecordName: (row: any) => string
  getRecordIdentifier: (row: any) => string
  onExportTable?: (selected: any[]) => void
  onExportZip?: (selected: any[]) => void
  onExportExcel?: (selected: any[]) => void
  mode: 'pdf' | 'excel'
}

export const SelectiveExportModal: React.FC<SelectiveExportModalProps> = ({
  isOpen,
  onClose,
  title,
  rows,
  getRecordName,
  getRecordIdentifier,
  onExportTable,
  onExportZip,
  onExportExcel,
  mode
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Normalize rows for easy list rendering
  const items = useMemo(() => {
    const list = rows.map((row) => ({
      id: row.id || getRecordIdentifier(row),
      name: getRecordName(row),
      identifier: getRecordIdentifier(row),
      raw: row
    }))
    // Sort alphabetically by name
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [rows, getRecordName, getRecordIdentifier])

  // Reset selections when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Select all by default when modal opens
      setSelectedIds(new Set(items.map((item) => item.id)))
      setSearchQuery('')
    }
  }, [isOpen, items])

  // Filter items in list based on search query
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.identifier.toLowerCase().includes(query)
    )
  }, [items, searchQuery])

  if (!isOpen) return null

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleSelectAllToggle = () => {
    const visibleIds = filteredItems.map((item) => item.id)
    const allVisibleSelected = visibleIds.every((id) => selectedIds.has(id))
    const next = new Set(selectedIds)
    
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id))
    } else {
      visibleIds.forEach((id) => next.add(id))
    }
    setSelectedIds(next)
  }

  const getSelectedRawItems = () => {
    return items.filter((item) => selectedIds.has(item.id)).map((item) => item.raw)
  }

  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id))

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        style={{
          maxWidth: 600,
          background: 'var(--card-bg, #ffffff)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: 12
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100, #f3f4f6)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900, #111827)' }}>
              Export {mode === 'pdf' ? 'PDF' : 'Excel'} Selection
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--gray-400, #9ca3af)' }}>
              {title}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400, #9ca3af)' }}>
              <Search size={15} />
            </span>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 34, width: '100%', fontSize: '0.875rem' }}
              placeholder="Search by name, reference or file number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Checklist header with select all */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'var(--gray-50, #f9fafb)',
              borderRadius: 6,
              fontSize: '0.825rem',
              fontWeight: 600,
              color: 'var(--gray-600, #4b5563)'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={handleSelectAllToggle}
                style={{ cursor: 'pointer' }}
              />
              Select All (Matching)
            </label>
            <span>
              {selectedIds.size} of {items.length} records selected
            </span>
          </div>

          {/* Scrollable list */}
          <div
            style={{
              maxHeight: 250,
              overflowY: 'auto',
              border: '1px solid var(--gray-100, #f3f4f6)',
              borderRadius: 8,
              padding: '4px 0'
            }}
          >
            {filteredItems.length === 0 ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--gray-400, #9ca3af)', fontSize: '0.875rem' }}>
                No records found matching search query.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isChecked = selectedIds.has(item.id)
                return (
                  <label
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: isChecked ? 'var(--gray-800, #1f2937)' : 'var(--gray-500, #6b7280)',
                      background: isChecked ? 'var(--brand-50, #f5f3ff)' : 'transparent',
                      borderBottom: '1px solid var(--gray-50, #f9fafb)',
                      margin: 0,
                      transition: 'background 0.1s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleItem(item.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: isChecked ? 600 : 400 }}>{item.name}</span>
                      <span style={{ fontSize: '0.725rem', color: 'var(--gray-400, #9ca3af)', fontFamily: 'monospace' }}>
                        ID/Ref: {item.identifier}
                      </span>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>

        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--gray-100, #f3f4f6)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10
          }}
        >
          <button className="btn btn-outline btn-sm" onClick={onClose}>
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {mode === 'pdf' ? (
              <>
                {onExportTable && (
                  <button
                    className="btn btn-outline btn-sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                      onExportTable(getSelectedRawItems())
                      onClose()
                    }}
                    style={{ color: 'var(--brand-600)', borderColor: 'var(--brand-200)' }}
                  >
                    Export Table (PDF)
                  </button>
                )}
                {onExportZip && (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => {
                      onExportZip(getSelectedRawItems())
                      onClose()
                    }}
                  >
                    Export Details (ZIP)
                  </button>
                )}
              </>
            ) : (
              onExportExcel && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => {
                    onExportExcel(getSelectedRawItems())
                    onClose()
                  }}
                  style={{ background: '#16a34a', borderColor: '#16a34a' }} // green for Excel
                >
                  Export Selected (Excel)
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
