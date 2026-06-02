import React from 'react'
import { X, ListFilter, Files } from 'lucide-react'

interface FilterExportOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  onExportFiltered: () => void
  onExportAll: () => void
  mode: 'pdf' | 'excel'
}

export const FilterExportOptionsModal: React.FC<FilterExportOptionsModalProps> = ({
  isOpen,
  onClose,
  title,
  onExportFiltered,
  onExportAll,
  mode
}) => {
  if (!isOpen) return null

  const isPdf = mode === 'pdf'

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        style={{
          maxWidth: 450,
          background: 'var(--card-bg, #ffffff)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          borderRadius: 12
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100, #f3f4f6)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--gray-900, #111827)' }}>
              Export Options ({isPdf ? 'PDF' : 'Excel'})
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--gray-400, #9ca3af)' }}>
              {title}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div
          className="modal-body"
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {/* Option 1: Export Filtered */}
          <button
            onClick={() => {
              onExportFiltered()
              onClose()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px',
              border: '2px solid var(--brand-100, #ede9fe)',
              background: 'var(--brand-50, #f5f3ff)',
              color: 'var(--brand-700, #6d28d9)',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: 10,
                borderRadius: '50%',
                display: 'flex',
                color: isPdf ? 'var(--brand-600, #4f46e5)' : '#16a34a'
              }}
            >
              <ListFilter size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Export Filtered Records Only</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--gray-500, #6b7280)', marginTop: 2 }}>
                Only exports the records matching your current filters and search terms.
              </div>
            </div>
          </button>

          {/* Option 2: Export All */}
          <button
            onClick={() => {
              onExportAll()
              onClose()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '16px',
              border: '2px solid var(--gray-100, #f3f4f6)',
              background: '#ffffff',
              color: 'var(--gray-700, #374151)',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                background: 'var(--gray-50, #f9fafb)',
                padding: 10,
                borderRadius: '50%',
                display: 'flex',
                color: 'var(--gray-500, #6b7280)'
              }}
            >
              <Files size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.925rem' }}>Export All Database Records</div>
              <div style={{ fontSize: '0.775rem', color: 'var(--gray-500, #6b7280)', marginTop: 2 }}>
                Exports all records in this table category, ignoring any active search filters.
              </div>
            </div>
          </button>
        </div>

        <div
          className="modal-footer"
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--gray-100, #f3f4f6)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
