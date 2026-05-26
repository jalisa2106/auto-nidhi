import { useEffect, useState } from 'react'
import { filesApi } from '../../api/services'
import PageHeader from '../../components/app/PageHeader'

interface FileRecord {
  id: string
  file_number: string
  file_type?: string
  status?: string
  finance_bank?: string
  created_at?: string
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  active:      { bg: 'var(--brand-50)',  color: 'var(--brand-700)' },
  completed:   { bg: '#dcfce7',          color: '#15803d' },
  cancelled:   { bg: '#fee2e2',          color: '#b91c1c' },
  'under process': { bg: '#fef3c7',      color: '#d97706' },
  pending:     { bg: '#fef3c7',          color: '#d97706' },
}

function statusStyle(status?: string) {
  const key = (status || '').toLowerCase()
  return STATUS_COLOR[key] || { bg: 'var(--gray-100)', color: 'var(--gray-600)' }
}

export default function CustomerFilesPage() {
  const [files, setFiles]   = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await filesApi.list(1, 50)
        setFiles(Array.isArray(res) ? res : res.data || [])
      } catch (e: any) {
        setError('Failed to load files. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <PageHeader title="My Files" subtitle="All your loan & insurance files" />

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontWeight: 500 }}>
            Loading your files…
          </div>
        ) : files.length === 0 ? (
          <div className="data-empty">No files found.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>File No.</th>
                <th>Type</th>
                <th>Status</th>
                <th>Finance Bank</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {files.map(f => {
                const { bg, color } = statusStyle(f.status)
                return (
                  <tr key={f.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', color: 'var(--brand-600)', fontWeight: 600 }}>
                        {f.file_number}
                      </span>
                    </td>
                    <td>{f.file_type || '—'}</td>
                    <td>
                      <span style={{ fontSize: '.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: bg, color }}>
                        {f.status || 'Active'}
                      </span>
                    </td>
                    <td>{f.finance_bank || '—'}</td>
                    <td style={{ color: 'var(--gray-500)', fontSize: '.85rem' }}>
                      {f.created_at ? f.created_at.slice(0, 10) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
