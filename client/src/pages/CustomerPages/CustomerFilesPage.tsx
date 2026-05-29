import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/app/PageHeader'
import FileStatusBadge from '../../components/CustomerPages/FileStatusBadge'
import api from '../../api/axios'
import '../CSS_pages/CustomerFilesPage.css'

interface CustomerFile {
  id: string
  file_number: string
  file_type: string
  status: string
  assigned_to?: string | null
  finance_amount?: number | null
  finance_bank?: string | null
  created_at: string
  updated_at: string
}

type FileStatus = 'draft' | 'login' | 'under_process' | 'sanctioned' | 'disbursed' | 'completed' | 'cancelled' | 'all'
type FileType = 'new_vehicle' | 'used_vehicle' | 'renewal' | 'all'
type SortField = 'file_number' | 'created_at' | 'status' | 'assigned_to'

export default function CustomerFilesPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<CustomerFile[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FileStatus>('all')
  const [typeFilter, setTypeFilter] = useState<FileType>('all')
  const [sortBy] = useState<SortField>('created_at')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    api.get<CustomerFile[]>('/portal/files')
      .then((res) => setFiles(res.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredAndSortedFiles = useMemo(() => {
    let result = [...files]
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(f => f.file_number.toLowerCase().includes(query))
    }
    if (statusFilter !== 'all') result = result.filter(f => f.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter(f => f.file_type === typeFilter)

    result.sort((a, b) => {
      let aVal: any = a[sortBy]
      let bVal: any = b[sortBy]
      if (sortBy === 'created_at') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [files, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const totalPages = Math.ceil(filteredAndSortedFiles.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedFiles = filteredAndSortedFiles.slice(startIdx, startIdx + itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [searchQuery, statusFilter, typeFilter])

  return (
    <>
      <PageHeader title="My Files" subtitle="Track and audit your vehicular assets financing portfolio pipeline" />

      {/* Filters Toolbar */}
      <div className="files-toolbar">
        <div className="search-box">
          <input type="text" placeholder="Search by file number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
        </div>
        <div className="filters-group">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as FileType)} className="filter-select">
            <option value="all">All Types</option>
            <option value="new_vehicle">New Vehicle</option>
            <option value="used_vehicle">Used Vehicle</option>
            <option value="renewal">Renewal</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FileStatus)} className="filter-select">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="login">Login</option>
            <option value="under_process">Under Process</option>
            <option value="sanctioned">Sanctioned</option>
            <option value="disbursed">Disbursed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button className="clear-filters-btn" onClick={() => { setSearchQuery(''); setStatusFilter('all'); setTypeFilter('all'); }}>Clear Filters</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="data-card"><div className="skeleton-table">{[...Array(4)].map((_, i) => <div key={i} className="skeleton-row" />)}</div></div>
      ) : filteredAndSortedFiles.length === 0 ? (
        <div className="data-card"><div className="empty-state"><p className="empty-title">No workspace files mapped matches parameters.</p></div></div>
      ) : (
        <div className="data-card">
          <table className="files-table">
            <thead>
              <tr>
                <th>File No.</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Finance Details</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles.map((file) => (
                <tr key={file.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/portal/files/${file.id}`)}>
                  <td className="file-number" style={{ fontWeight: 600, color: 'var(--brand-700)' }}>{file.file_number}</td>
                  <td className="file-type">{file.file_type.replace(/_/g, ' ').toUpperCase()}</td>
                  <td><FileStatusBadge status={file.status} size="small" /></td>
                  <td>{file.assigned_to || '—'}</td>
                  <td>
                    {file.finance_amount ? (
                      <>
                        <span className="finance-amount" style={{ fontWeight: 600 }}>₹{file.finance_amount.toLocaleString('en-IN')}</span>
                        {file.finance_bank && <span className="finance-bank" style={{ display: 'block', fontSize: '0.78rem', color: 'var(--gray-400)' }}>{file.finance_bank}</span>}
                      </>
                    ) : '—'}
                  </td>
                  <td>{new Date(file.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/portal/files/${file.id}`); }}>
                      View Details →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
              <div className="pagination-bar" style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)' }}>
                <span className="pagination-info">Total pages: {totalPages} ({filteredAndSortedFiles.length} files found)</span>
              </div>
          )}
        </div>
      )}
    </>
  )
}