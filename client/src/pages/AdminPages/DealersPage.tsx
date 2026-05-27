import { useMemo, useState } from 'react'
import {
  Users, Building2, UserCheck, Plus, X, Eye, Trash2, RotateCcw,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'

// Soft delete note:
// The dealers master should use a soft-delete flag instead of hard deleting rows.
// DB migration required:
//   ALTER TABLE master_dealer ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
// Then update queries to only return rows where is_deleted = FALSE,
// and soft delete by setting is_deleted = TRUE.
// In SQLAlchemy, add:
//   is_deleted = Column(Boolean, nullable=False, default=False)

// ─── TYPES & CONTRACT BOUNDARIES ──────────────────────────────────────────
interface Dealer {
  id: string
  name: string
  showroom_name: string
  phone: string
  email: string
  area_branch: string
  status: 'Active' | 'Inactive'
  total_files_referred: number
  is_deleted: boolean
}

// ─── INITIAL STRUCTURED MOCK DATA ──────────────────────────────────────────
const INITIAL_DEALER_RECORDS: Dealer[] = [
  {
    id: "DL001",
    name: "Rajesh Patel",
    showroom_name: "Maruti Suzuki Arena (Anand)",
    phone: "+91 98765 43210",
    email: "rajesh@marutianand.com",
    area_branch: "Amul Dairy Road",
    status: "Active",
    total_files_referred: 24,
    is_deleted: false
  },
  {
    id: "DL002",
    name: "Vikram Shah",
    showroom_name: "Hyundai Landmark (Nadiad)",
    phone: "+91 98250 11223",
    email: "v.shah@landmarkhyundai.com",
    area_branch: "National Highway 8",
    status: "Active",
    total_files_referred: 18,
    is_deleted: false
  },
  {
    id: "DL003",
    name: "Amit Sharma",
    showroom_name: "Tata Motors Cargo (Vadodara)",
    phone: "+91 94280 55667",
    email: "payouts@cargotata.com",
    area_branch: "Alkapuri",
    status: "Inactive",
    total_files_referred: 5,
    is_deleted: false
  }
]

const INITIAL_FORM_STATE = {
  name: '',
  showroom_name: '',
  phone: '',
  email: '',
  area_branch: '',
  status: 'Active' as 'Active' | 'Inactive'
}

export default function DealersPage() {
  const [rows, setRows] = useState<Dealer[]>(INITIAL_DEALER_RECORDS) // Fallback state register
  const [showAdd, setShowAdd] = useState(false)
  const [viewRow, setViewRow] = useState<Dealer | null>(null)
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filtering Context States
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

      {/* View Dealer Modal */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Dealer Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: 8 }}>
                <div><strong>ID:</strong> {viewRow.id}</div>
                <div><strong>Showroom:</strong> {viewRow.showroom_name}</div>
                <div><strong>Contact:</strong> {viewRow.name} — {viewRow.phone}</div>
                <div><strong>Email:</strong> {viewRow.email}</div>
                <div><strong>Area / Branch:</strong> {viewRow.area_branch}</div>
                <div><strong>Status:</strong> {viewRow.status}</div>
                <div><strong>Sourced Files:</strong> {viewRow.total_files_referred}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

  // Pagination Registers
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ─── PIPELINE: COMPLIANCE FILTER MATRIX ───
  const processedRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.is_deleted) return false // Standard soft-delete enforcement shield

      if (search) {
        const query = search.toLowerCase()
        if (
          !r.name.toLowerCase().includes(query) &&
          !r.showroom_name.toLowerCase().includes(query) &&
          !r.area_branch.toLowerCase().includes(query)
        ) return false
      }

      if (filterStatus && r.status !== filterStatus) return false
      return true
    })
  }, [rows, search, filterStatus])

  const totalPages = Math.max(1, Math.ceil(processedRows.length / pageSize))
  const safePageIndex = Math.min(page, totalPages)
  const paginatedRows = processedRows.slice((safePageIndex - 1) * pageSize, safePageIndex * pageSize)

  // ─── CORE KPI METRIC COMPUTING ───
  const totalDealers = rows.filter(r => !r.is_deleted).length
  const activeDealers = rows.filter(r => !r.is_deleted && r.status === 'Active').length
  const aggregateFilesReferred = rows.filter(r => !r.is_deleted).reduce((sum, r) => sum + r.total_files_referred, 0)

  // ─── ACTIONS / MUTATION DISPATCHERS ───
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Dealer manager name required.'
    if (!form.showroom_name.trim()) errs.showroom_name = 'Showroom commercial identity entity missing.'
    if (!form.phone.trim()) errs.phone = 'Contact line number is mandatory.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAddDealer = () => {
    if (!validate()) return

    const newDealer: Dealer = {
      id: `DL${String(rows.length + 1).padStart(3, '0')}`,
      name: form.name.trim(),
      showroom_name: form.showroom_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || '—',
      area_branch: form.area_branch.trim() || 'Main Branch',
      status: form.status,
      total_files_referred: 0,
      is_deleted: false
    }

    setRows([newDealer, ...rows])
    setForm(INITIAL_FORM_STATE)
    setErrors({})
    setShowAdd(false)
    setPage(1)
  }

  const handleSoftDelete = (targetId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (window.confirm("Soft-delete this dealer network profile? Historical files mapped to this dealer will preserve their auditing integrity.")) {
      setRows(prev => prev.map(r => r.id === targetId ? { ...r, is_deleted: true } : r))
    }
  }

  return (
    <>
      <PageHeader title="Dealers" subtitle="Manage showroom partnerships and sub-dealer sourcing networks" />

      {/* ── KPI METRICS TRACKER BLOCK ── */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><Building2 size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Onboarded Dealerships</div>
            <div className="pay-kpi-value" style={{ color: 'var(--brand-700)' }}>{totalDealers}</div>
            <div className="pay-kpi-sub">Registered showroom locations</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green"><UserCheck size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Active Channel Partners</div>
            <div className="pay-kpi-value" style={{ color: '#137333' }}>{activeDealers}</div>
            <div className="pay-kpi-sub">Actively sourcing loan business</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon amber"><Users size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Files Sourced</div>
            <div className="pay-kpi-value" style={{ color: '#b45309' }}>{aggregateFilesReferred}</div>
            <div className="pay-kpi-sub">Cumulative transactions portfolio</div>
          </div>
        </div>
      </div>

      {/* ── FILTER MATRIX CONTROL BAR ── */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input className="pay-filter-input" placeholder="Search by name, showroom franchise, area location..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="pay-filter-group" style={{ width: 180 }}>
          <span className="pay-filter-label">Network Status</span>
          <select className="pay-filter-input" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">All partners</option>
            <option value="Active">Active Network</option>
            <option value="Inactive">Inactive / Suspended</option>
          </select>
        </div>
        {(search || filterStatus) && (
          <button className="pay-filter-reset" onClick={() => { setSearch(''); setFilterStatus(''); setPage(1); }}>
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Dealer
        </button>
      </div>

      {/* ── MAIN DATA TABLE RENDER ── */}
      <div className="data-card">
        {processedRows.length === 0 ? (
          <div className="data-empty">No dealer accounts found matching current workspace parameters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>DEALERSHIP / SHOWROOM</th>
                    <th>CONTACT PERSON</th>
                    <th>MOBILE NO.</th>
                    <th>EMAIL ID</th>
                    <th>AREA / BRANCH</th>
                    <th>STATUS</th>
                    <th>SOURCED FILES</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontFamily: 'monospace', color: 'var(--gray-400)', fontSize: '0.82rem' }}>{r.id}</td>
                      <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{r.showroom_name}</td>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td>{r.phone}</td>
                      <td style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>{r.email}</td>
                      <td><span className="db-file-id" style={{ background: '#f3f4f6', color: '#4b5563' }}>{r.area_branch}</span></td>
                      <td>
                        <span className={`from-badge ${r.status === 'Active' ? 'from-dealer' : 'from-other'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, paddingLeft: 24 }}>{r.total_files_referred}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }} onClick={() => setViewRow(r)}>
                            <Eye size={13} />
                          </button>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }} onClick={(e) => handleSoftDelete(r.id, e)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Component Link alignment matching system layout spec */}
            <div className="pagination-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="pagination-info">Showing {Math.min((safePageIndex - 1) * pageSize + 1, processedRows.length)}–{Math.min(safePageIndex * pageSize, processedRows.length)} of {processedRows.length} partners</span>
                <select className="page-size-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[10, 20, 50].map((s) => <option key={s} value={s}>{s} / page</option>)}
                </select>
              </div>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => setPage(1)} disabled={safePageIndex === 1}><ChevronsLeft size={14} /></button>
                <button className="page-btn" onClick={() => setPage(safePageIndex - 1)} disabled={safePageIndex === 1}><ChevronLeft size={14} /></button>
                <button className="page-btn active">{safePageIndex}</button>
                <button className="page-btn" onClick={() => setPage(safePageIndex + 1)} disabled={safePageIndex === totalPages}><ChevronRight size={14} /></button>
                <button className="page-btn" onClick={() => setPage(totalPages)} disabled={safePageIndex === totalPages}><ChevronsRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── CREATION FORM DIALOG MODAL OVERLAY ── */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Onboard New Showroom Partner</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddDealer(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Franchise & Outlet Profile</div>
                  
                  <div className="form-group modal-full">
                    <label className="form-label">Showroom / Dealership Name *</label>
                    <input className={`form-input ${errors.showroom_name ? 'error' : ''}`} placeholder="e.g. Maruti Suzuki Arena (Anand)" value={form.showroom_name} onChange={(e) => setForm({...form, showroom_name: e.target.value})} />
                    {errors.showroom_name && <span className="form-error">{errors.showroom_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Person / Manager Name *</label>
                    <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Rajesh Patel" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Geographic Area / Branch Location</label>
                    <input className="form-input" placeholder="e.g. Amul Dairy Road" value={form.area_branch} onChange={(e) => setForm({...form, area_branch: e.target.value})} />
                  </div>

                  <div className="modal-section-label">Communications & Governance</div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="e.g. +91 98765 43210" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address ID</label>
                    <input type="email" className="form-input" placeholder="e.g. contact@showroom.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Initial Network Status *</label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                      <option value="Active">Active (Permit immediate sourcing)</option>
                      <option value="Inactive">Inactive / On Hold</option>
                    </select>
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Onboard Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}