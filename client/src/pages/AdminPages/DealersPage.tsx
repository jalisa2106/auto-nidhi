import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import {
  Building2, UserCheck, Plus, X, Pencil, Trash2, RotateCcw,
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight,
  FileSpreadsheet, FileDown
} from 'lucide-react'
import { exportToExcel, exportToPDF, type ColumnDefinition } from '../../utils/exportUtils'
import PageHeader from '../../components/app/PageHeader'
import { dealersApi } from '../../api/services'

// ─── TYPES & CONTRACT BOUNDARIES ──────────────────────────────────────────
interface Dealer {
  id: string
  name: string
  showroom_name: string
  phone: string
  email: string
  area_branch: string
  status: 'Active' | 'Inactive'
  is_deleted: boolean
}

const INITIAL_FORM_STATE = {
  name: '',
  showroom_name: '',
  phone: '',
  email: '',
  area_branch: '',
  status: 'Active' as 'Active' | 'Inactive'
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatDealerId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `DEALER-${id.slice(0, 8)}`
  return id
}

export default function DealersPage() {
  const [rows, setRows] = useState<Dealer[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  
  const [form, setForm] = useState(INITIAL_FORM_STATE)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Filtering Context States
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Pagination Registers
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ─── DATA FETCHING ───
  const loadDealers = async () => {
    try {
      const data = await dealersApi.list()
      setRows(data)
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to load dealers')
    }
  }

  useEffect(() => {
    void loadDealers()
  }, [])

  // ─── PIPELINE: COMPLIANCE FILTER MATRIX ───
  const processedRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.is_deleted) return false

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

  const exportColumns: ColumnDefinition[] = [
    { header: 'ID', dataKey: 'formattedId' },
    { header: 'Showroom Name', dataKey: 'showroom_name' },
    { header: 'Contact Person', dataKey: 'name' },
    { header: 'Phone', dataKey: 'phone' },
    { header: 'Email', dataKey: 'email' },
    { header: 'Area / Branch', dataKey: 'area_branch' },
    { header: 'Status', dataKey: 'status' }
  ]

  const getExportData = () => {
    return processedRows.map((r) => ({
      ...r,
      formattedId: formatDealerId(r.id),
      showroom_name: r.showroom_name || '—',
      name: r.name || '—',
      phone: r.phone || '—',
      email: r.email || '—',
      area_branch: r.area_branch || '—',
      status: r.status ? r.status.toUpperCase() : 'ACTIVE',
    }))
  }

  const exportExcel = () => {
    exportToExcel({
      filename: `dealers_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Dealers',
      columns: exportColumns,
      data: getExportData()
    })
  }

  const exportPDF = () => {
    exportToPDF({
      filename: `dealers_${new Date().toISOString().slice(0, 10)}`,
      title: 'Dealers Report',
      columns: exportColumns,
      data: getExportData(),
      orientation: 'landscape'
    })
  }

  // ─── CORE KPI METRIC COMPUTING ───
  const totalDealers = rows.filter(r => !r.is_deleted).length
  const activeDealers = rows.filter(r => !r.is_deleted && r.status === 'Active').length

  // ─── ACTIONS / MUTATION DISPATCHERS ───
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Dealer manager name required.'
    if (!form.showroom_name.trim()) errs.showroom_name = 'Showroom name missing.'
    if (!form.phone.trim()) {
      errs.phone = 'Contact line number is mandatory.'
    } else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) {
      errs.phone = 'Phone must be exactly 10 digits'
    }
    if (!form.email.trim()) errs.email = 'Email address is required.'
    if (!form.area_branch.trim()) errs.area_branch = 'Geographic area / branch is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAddDealer = async () => {
    if (!validate()) return

    try {
      const created = await dealersApi.create({
        name: form.name.trim(),
        showroom_name: form.showroom_name.trim(),
        city: form.area_branch.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status
      })
      
      setRows(prev => [created, ...prev])
      setForm(INITIAL_FORM_STATE)
      setErrors({})
      setShowAdd(false)
      setPage(1)
      message.success('Showroom partner onboarded successfully')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to add dealer')
    }
  }

  const openEdit = (row: Dealer) => {
    setEditId(row.id)
    setForm({
      name: row.name,
      showroom_name: row.showroom_name,
      phone: row.phone,
      email: row.email,
      area_branch: row.area_branch,
      status: row.status
    })
    setErrors({})
    setEditOpen(true)
  }

  const handleEditDealer = async () => {
    if (!validate() || !editId) return

    try {
      const updated = await dealersApi.update(editId, {
        name: form.name.trim(),
        showroom_name: form.showroom_name.trim(),
        city: form.area_branch.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status
      })

      setRows(prev => prev.map(r => r.id === editId ? updated : r))
      setForm(INITIAL_FORM_STATE)
      setErrors({})
      setEditOpen(false)
      setEditId(null)
      message.success('Showroom partner updated successfully')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update dealer')
    }
  }

  const handleSoftDelete = async (targetId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    if (!window.confirm("Soft-delete this dealer network profile? Historical files mapped to this dealer will preserve their auditing integrity.")) {
      return
    }

    try {
      await dealersApi.remove(targetId)
      setRows(prev => prev.map(r => r.id === targetId ? { ...r, is_deleted: true } : r))
      message.success('Dealer profile deactivated')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete dealer')
    }
  }

  return (
    <>
      <PageHeader title="Dealers" subtitle="Manage showroom partnerships and sub-dealer sourcing networks" />

      {/* ── KPI METRICS TRACKER BLOCK ── */}
      <div className="pay-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
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
        <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportExcel}>
          <FileSpreadsheet size={14} /> Export Excel
        </button>
        <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportPDF}>
          <FileDown size={14} /> Export PDF
        </button>
        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => { setForm(INITIAL_FORM_STATE); setErrors({}); setShowAdd(true); }}>
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
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((r) => (
                    <tr key={r.id}>
                      <td title={r.id} style={{ color: 'var(--brand-700)', fontWeight: 600, fontSize: '.8rem', fontFamily: 'monospace' }}>
                        {formatDealerId(r.id)}
                      </td>
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            id={`dealer-edit-${r.id}`}
                            type="button"
                            onClick={() => openEdit(r)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-100)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-50)')}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            id={`dealer-delete-${r.id}`}
                            type="button"
                            onClick={(e) => handleSoftDelete(r.id, e)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#b91c1c', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}>
                            <Trash2 size={12} /> Delete
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
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAddDealer(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Franchise & Outlet Profile</div>
                  
                  <div className="form-group modal-full">
                    <label className="form-label">Showroom / Dealership Name <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.showroom_name ? 'error' : ''}`} placeholder="e.g. Maruti Suzuki Arena (Anand)" value={form.showroom_name} onChange={(e) => setForm({...form, showroom_name: e.target.value})} />
                    {errors.showroom_name && <span className="form-error">{errors.showroom_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Person / Manager Name <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Rajesh Patel" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Geographic Area / Branch Location <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.area_branch ? 'error' : ''}`} placeholder="e.g. Amul Dairy Road" value={form.area_branch} onChange={(e) => setForm({...form, area_branch: e.target.value})} />
                    {errors.area_branch && <span className="form-error">{errors.area_branch}</span>}
                  </div>

                  <div className="modal-section-label">Communications & Governance</div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="e.g. +91 98765 43210" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address ID <span style={{ color: 'red' }}>*</span></label>
                    <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="e.g. contact@showroom.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Initial Network Status <span style={{ color: 'red' }}>*</span></label>
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

      {/* ── EDIT FORM DIALOG MODAL OVERLAY ── */}
      {editOpen && (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Showroom Partner</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEditDealer(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Franchise & Outlet Profile</div>
                  
                  <div className="form-group modal-full">
                    <label className="form-label">Showroom / Dealership Name <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.showroom_name ? 'error' : ''}`} placeholder="e.g. Maruti Suzuki Arena (Anand)" value={form.showroom_name} onChange={(e) => setForm({...form, showroom_name: e.target.value})} />
                    {errors.showroom_name && <span className="form-error">{errors.showroom_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Person / Manager Name <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.name ? 'error' : ''}`} placeholder="e.g. Rajesh Patel" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                    {errors.name && <span className="form-error">{errors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Geographic Area / Branch Location <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.area_branch ? 'error' : ''}`} placeholder="e.g. Amul Dairy Road" value={form.area_branch} onChange={(e) => setForm({...form, area_branch: e.target.value})} />
                    {errors.area_branch && <span className="form-error">{errors.area_branch}</span>}
                  </div>

                  <div className="modal-section-label">Communications & Governance</div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number <span style={{ color: 'red' }}>*</span></label>
                    <input className={`form-input ${errors.phone ? 'error' : ''}`} placeholder="e.g. +91 98765 43210" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address ID <span style={{ color: 'red' }}>*</span></label>
                    <input type="email" className={`form-input ${errors.email ? 'error' : ''}`} placeholder="e.g. contact@showroom.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                    {errors.email && <span className="form-error">{errors.email}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Network Status <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-input" value={form.status} onChange={(e) => setForm({...form, status: e.target.value as any})}>
                      <option value="Active">Active (Permit immediate sourcing)</option>
                      <option value="Inactive">Inactive / On Hold</option>
                    </select>
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
