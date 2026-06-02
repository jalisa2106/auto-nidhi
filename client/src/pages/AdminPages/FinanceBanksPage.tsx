import { useEffect, useState } from 'react'
import {
  Building2, Search, Plus, X, Pencil, Trash2,
  Phone, MapPin, RotateCcw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { message } from 'antd'
import PageHeader from '../../components/app/PageHeader'
import { financeBanksApi } from '../../api/services'
import { exportToExcel, exportToPDF, type ColumnDefinition } from '../../utils/exportUtils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinanceBank {
  id: string
  bank_name: string
  area: string | null
  contact_no: string | null
}

const EMPTY_FORM = { bank_name: '', area: '', contact_no: '' }

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = Math.min((page - 1) * pageSize + 1, total)
  const end   = Math.min(page * pageSize, total)

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
        <span className="pagination-info">
          Showing {start}–{end} of {total} records
        </span>
        <select
          className="page-size-select"
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}
        >
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
          ) : (
            <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
          )
        )}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinanceBanksPage() {
  const [rows, setRows]         = useState<FinanceBank[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading]   = useState(false)

  // Modals
  const [showAdd, setShowAdd]   = useState(false)
  const [editRow, setEditRow]   = useState<FinanceBank | null>(null)
  const [deleteRow, setDeleteRow] = useState<FinanceBank | null>(null)

  // Form
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)

  // Filters & Pagination
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const loadBanks = async () => {
    setLoading(true)
    try {
      const res = await financeBanksApi.list(page, pageSize, search)
      setRows(res.data || [])
      setTotalRows(res.total || 0)
    } catch {
      message.error('Failed to load finance banks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBanks()
  }, [page, pageSize, search])

  const exportColumns: ColumnDefinition[] = [
    { header: 'Bank / NBFC Name', dataKey: 'bank_name' },
    { header: 'Area / Region', dataKey: 'area' },
    { header: 'Contact No.', dataKey: 'contact_no' }
  ]

  const getExportData = (data: FinanceBank[]) => {
    return data.map((r) => ({
      ...r,
      bank_name: r.bank_name,
      area: r.area || '—',
      contact_no: r.contact_no || '—',
    }))
  }

  // ── Export Excel
  const exportExcel = async () => {
    try {
      message.loading({ content: 'Preparing Excel export...', key: 'export' })
      const res = await financeBanksApi.list(1, 100000, search)
      const allMatchingRows = res.data || []
      
      exportToExcel({
        filename: `finance_banks_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Finance Banks',
        columns: exportColumns,
        data: getExportData(allMatchingRows)
      })

      message.success({ content: 'Excel exported successfully!', key: 'export' })
    } catch {
      message.error({ content: 'Failed to export Excel', key: 'export' })
    }
  }

  // ── Export PDF
  const exportPDF = async () => {
    try {
      message.loading({ content: 'Preparing PDF export...', key: 'export' })
      const res = await financeBanksApi.list(1, 100000, search)
      const allMatchingRows = res.data || []
      
      exportToPDF({
        filename: `finance_banks_${new Date().toISOString().slice(0, 10)}`,
        title: 'Finance Banks Report',
        columns: exportColumns,
        data: getExportData(allMatchingRows),
        orientation: 'portrait'
      })

      message.success({ content: 'PDF exported successfully!', key: 'export' })
    } catch {
      message.error({ content: 'Failed to export PDF', key: 'export' })
    }
  }

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.bank_name.trim()) e.bank_name = 'Bank name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Add ──
  async function handleAdd() {
    if (!validate()) return
    setSaving(true)
    try {
      await financeBanksApi.create({
        bank_name: form.bank_name.trim(),
        area: form.area.trim() || undefined,
        contact_no: form.contact_no.trim() || undefined,
      })
      message.success('Finance bank added successfully')
      setShowAdd(false)
      setForm({ ...EMPTY_FORM })
      setErrors({})
      loadBanks()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to add bank')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit ──
  function openEdit(row: FinanceBank) {
    setEditRow(row)
    setForm({ bank_name: row.bank_name, area: row.area || '', contact_no: row.contact_no || '' })
    setErrors({})
  }

  async function handleEdit() {
    if (!validate() || !editRow) return
    setSaving(true)
    try {
      await financeBanksApi.update(editRow.id, {
        bank_name: form.bank_name.trim(),
        area: form.area.trim() || null,
        contact_no: form.contact_no.trim() || null,
      })
      message.success('Finance bank updated')
      setEditRow(null)
      setForm({ ...EMPTY_FORM })
      loadBanks()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update bank')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  async function handleDelete() {
    if (!deleteRow) return
    setSaving(true)
    try {
      await financeBanksApi.remove(deleteRow.id)
      message.success('Finance bank deleted')
      setDeleteRow(null)
      loadBanks()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Cannot delete — bank may be linked to loans')
    } finally {
      setSaving(false)
    }
  }

  function resetFilters() {
    setSearch(''); setPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Finance Banks"
        subtitle="External banks & NBFCs that finance customer vehicle loans"
      />

      {/* KPI strip */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><Building2 size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Finance Banks</div>
            <div className="pay-kpi-value">{totalRows}</div>
            <div className="pay-kpi-sub">Banks & NBFCs in master list</div>
          </div>
        </div>
      </div>

      {/* Filter & action bar */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input
              id="finance-banks-search"
              className="pay-filter-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search by bank name or area…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
        </div>
        {search && (
          <button className="pay-filter-reset" onClick={resetFilters} title="Clear search">
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button className="btn btn-outline btn-sm" onClick={exportExcel} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Export Excel
        </button>
        <button className="btn btn-outline btn-sm" onClick={exportPDF} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="15" y2="17" />
          </svg>
          Export PDF
        </button>
        <button
          id="finance-banks-add-btn"
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => { setForm({ ...EMPTY_FORM }); setErrors({}); setShowAdd(true) }}
        >
          <Plus size={14} /> Add Finance Bank
        </button>
      </div>

      {/* Table */}
      <div className="data-card">
        {loading ? (
          <div className="data-empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="data-empty">
            {search ? 'No banks match your search.' : 'No finance banks added yet. Click "Add Finance Bank" to begin.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bank / NBFC Name</th>
                    <th>Area / Region</th>
                    <th>Contact No.</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, flexShrink: 0,
                          }}>
                            {r.bank_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{r.bank_name}</span>
                        </div>
                      </td>
                      <td>
                        {r.area ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.84rem', color: 'var(--gray-600)' }}>
                            <MapPin size={12} color="var(--gray-400)" />{r.area}
                          </span>
                        ) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                      </td>
                      <td>
                        {r.contact_no ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.84rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>
                            <Phone size={12} color="var(--gray-400)" />{r.contact_no}
                          </span>
                        ) : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px', fontSize: '.78rem' }}
                            onClick={() => openEdit(r)}
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ padding: '5px 10px', fontSize: '.78rem', background: '#fff5f5', color: '#b91c1c', border: '1.5px solid #fee2e2' }}
                            onClick={() => setDeleteRow(r)}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              total={totalRows}
              page={page}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </>
        )}
      </div>

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Finance Bank</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd() }}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div className="form-group">
                    <label className="form-label">
                      Bank / NBFC Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="fb-bank-name"
                      className={`form-input ${errors.bank_name ? 'error' : ''}`}
                      placeholder="e.g. HDFC Bank, Bajaj Finance Limited…"
                      value={form.bank_name}
                      onChange={(e) => updateForm('bank_name', e.target.value)}
                      autoFocus
                    />
                    {errors.bank_name && <span className="form-error">{errors.bank_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Area / Region</label>
                    <input
                      id="fb-area"
                      className="form-input"
                      placeholder="e.g. Pan India, Pune, Mumbai South…"
                      value={form.area}
                      onChange={(e) => updateForm('area', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact / Toll-Free No.</label>
                    <input
                      id="fb-contact"
                      className="form-input"
                      placeholder="e.g. 1800-202-6161"
                      value={form.contact_no}
                      onChange={(e) => updateForm('contact_no', e.target.value)}
                    />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setShowAdd(false); setErrors({}) }}>
                  Cancel
                </button>
                <button type="submit" id="fb-save-btn" className="btn btn-primary btn-sm" disabled={saving}>
                  <Plus size={14} /> {saving ? 'Saving…' : 'Add Bank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRow && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Finance Bank</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleEdit() }}>
              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  <div className="form-group">
                    <label className="form-label">
                      Bank / NBFC Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="fb-edit-bank-name"
                      className={`form-input ${errors.bank_name ? 'error' : ''}`}
                      value={form.bank_name}
                      onChange={(e) => updateForm('bank_name', e.target.value)}
                    />
                    {errors.bank_name && <span className="form-error">{errors.bank_name}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Area / Region</label>
                    <input
                      id="fb-edit-area"
                      className="form-input"
                      value={form.area}
                      onChange={(e) => updateForm('area', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact / Toll-Free No.</label>
                    <input
                      id="fb-edit-contact"
                      className="form-input"
                      value={form.contact_no}
                      onChange={(e) => updateForm('contact_no', e.target.value)}
                    />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setEditRow(null); setErrors({}) }}>
                  Cancel
                </button>
                <button type="submit" id="fb-edit-save-btn" className="btn btn-primary btn-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteRow && (
        <div className="modal-backdrop" onClick={() => setDeleteRow(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: '#b91c1c' }}>Delete Finance Bank</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-700)', fontSize: '.9rem', lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deleteRow.bank_name}</strong>?
              </p>
              <p style={{ color: 'var(--gray-500)', fontSize: '.82rem', marginTop: 8 }}>
                ⚠️ This will fail if this bank is linked to existing loan records.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDeleteRow(null)}>
                Cancel
              </button>
              <button
                id="fb-delete-confirm-btn"
                className="btn btn-sm"
                style={{ background: '#b91c1c', color: '#fff', border: 'none' }}
                onClick={handleDelete}
                disabled={saving}
              >
                <Trash2 size={13} /> {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
