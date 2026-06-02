import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import FileStatusBadge, { type FileStatus as BadgeFileStatus } from '../../components/CustomerPages/FileStatusBadge'
import api from '../../api/axios'
import '../CSS_pages/CustomerFilesPage.css'

interface CustomerFile {
  id: string
  file_number: string
  file_type: string
  status: BadgeFileStatus
  assigned_to?: string | null
  finance_amount?: number | null
  finance_bank?: string | null
  created_at: string
  updated_at: string
}

type FileStatusFilter = BadgeFileStatus | 'all'
type FileType = 'new_vehicle' | 'used_vehicle' | 'renewal' | 'all'
type SortField = 'file_number' | 'created_at' | 'status' | 'assigned_to'

function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)
  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
  }

  return (
    <div className="pagination-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">Showing {start}-{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>...</span>
        ) : (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

export default function CustomerFilesPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<CustomerFile[]>([])
  const [loading, setLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FileStatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<FileType>('all')
  const [sortBy] = useState<SortField>('created_at')
  const [sortOrder] = useState<'asc' | 'desc'>('desc')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

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

  const startIdx = (currentPage - 1) * pageSize
  const paginatedFiles = filteredAndSortedFiles.slice(startIdx, startIdx + pageSize)

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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FileStatusFilter)} className="filter-select">
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
        <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
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
          <Pagination
            total={filteredAndSortedFiles.length}
            page={currentPage}
            pageSize={pageSize}
            onPage={setCurrentPage}
            onPageSize={setPageSize}
          />
        </div>
      )}
    </>
  )
}