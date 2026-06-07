import { useState, useEffect, useCallback } from 'react'

import {
  Plus, Search, Filter, Edit2, X, RefreshCw,
  FolderOpen, Calendar, User, Building2, FileText,
} from 'lucide-react'
import { filesApi } from '../../api/services'
import api from '../../api/axios'
import FileDetailDrawer from '../../components/app/FileDetailDrawer'

// ── DB field mappings (FileRecord model) ─────────────────────────────────────
// id, customer_id, created_by_user_id, assigned_to, file_number,
// docket_date, file_type, status, remarks, is_deleted, created_at, updated_at
// + joined: customer.full_name, finance_info.bank.bank_name, assignee.first_name

const STATUS_OPTIONS = [
  { value: 'draft',         label: 'Draft'         },
  { value: 'login',         label: 'Login'         },
  { value: 'under_process', label: 'Under Process' },
  { value: 'sanctioned',    label: 'Sanctioned'    },
  { value: 'disbursed',     label: 'Disbursed'     },
  { value: 'completed',     label: 'Completed'     },
  { value: 'cancelled',     label: 'Cancelled'     },
]

const FILE_TYPE_OPTIONS = [
  { value: 'new_vehicle',  label: 'New Vehicle'  },
  { value: 'used_vehicle', label: 'Used Vehicle' },
  { value: 'renewal',      label: 'Renewal'      },
]

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  draft:         { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  login:         { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  under_process: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  sanctioned:    { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  disbursed:     { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  completed:     { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  cancelled:     { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

function normalizeKey(s: string) {
  return (s || '').toLowerCase().replace(/\s+/g, '_')
}

function fmtStatus(s: string) {
  return (s || '').split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
}

function fmtType(t: string) {
  return FILE_TYPE_OPTIONS.find(o => o.value === t)?.label || fmtStatus(t) || '—'
}

function StatusBadge({ status }: { status: string }) {
  const key = normalizeKey(status)
  const sc = STATUS_COLOR[key] || STATUS_COLOR.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: sc.bg, color: sc.text,
      padding: '3px 10px', borderRadius: 99, fontSize: '.71rem', fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
      {fmtStatus(status)}
    </span>
  )
}

// ── Empty form shape ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  customer_id: '',
  bank_id: '',
  file_type: '',
  status: 'draft',
  docket_date: '',
  remarks: '',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DataEntryFilesPage() {

  // List state
  const [rows, setRows]         = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [typeF, setTypeF]       = useState('')
  const [statusF, setStatusF]   = useState('')

  // Reference data
  const [customers, setCustomers] = useState<any[]>([])
  const [banks, setBanks]         = useState<any[]>([])

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM })
  const [creating, setCreating]     = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit modal
  const [editOpen, setEditOpen]   = useState(false)
  const [editRow, setEditRow]     = useState<any>(null)
  const [editForm, setEditForm]   = useState({ file_type: '', status: '', docket_date: '', remarks: '' })
  const [updating, setUpdating]   = useState(false)
  const [editError, setEditError] = useState('')

  // Banner
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Drawer
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const ROWS_PER_PAGE = 10

  // ── Helpers ──────────────────────────────────────────────────────────────

  const showBanner = (type: 'ok' | 'err', msg: string) => {
    setBanner({ type, msg })
    setTimeout(() => setBanner(null), 3500)
  }

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await filesApi.list(page, ROWS_PER_PAGE, statusF || undefined, typeF || undefined)
      setRows(Array.isArray(res.data) ? res.data : res.data ?? [])
      setTotal(res.total || 0)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }, [statusF, typeF, page])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, typeF, statusF])

  useEffect(() => { loadFiles() }, [loadFiles])

  // Load customers + banks when create modal opens
  useEffect(() => {
    if (!createOpen) return
    if (customers.length === 0) {
      api.get('/customers/?limit=1000')
        .then(r => setCustomers(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
        .catch(() => {})
    }
    if (banks.length === 0) {
      api.get('/finance-banks/all')
        .then(r => {
          const d = r.data
          setBanks(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [])
        })
        .catch(() => {})
    }
  }, [createOpen])

  // ── Client-side search filter ─────────────────────────────────────────────

  const filtered = rows.filter(r => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (r.file_number || '').toLowerCase().includes(q) ||
      (r.customer || '').toLowerCase().includes(q) ||
      (r.bank || '').toLowerCase().includes(q) ||
      (r.assigned || '').toLowerCase().includes(q)
    )
  })

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    setCreateError('')
    if (!createForm.customer_id) { setCreateError('Customer is required'); return }
    if (!createForm.bank_id)     { setCreateError('Bank is required'); return }
    if (!createForm.file_type)   { setCreateError('File type is required'); return }
    if (!createForm.status)      { setCreateError('Status is required'); return }

    setCreating(true)
    try {
      await filesApi.create({
        customer_id: createForm.customer_id,
        bank_id:     createForm.bank_id,
        file_type:   createForm.file_type,
        status:      createForm.status,
        docket_date: createForm.docket_date || null,
        remarks:     createForm.remarks || null,
      })
      showBanner('ok', 'File created successfully!')
      setCreateOpen(false)
      setCreateForm({ ...EMPTY_FORM })
      loadFiles()
    } catch (e: any) {
      setCreateError(e?.response?.data?.detail || e?.message || 'Failed to create file')
    } finally {
      setCreating(false)
    }
  }

  const openEdit = (row: any) => {
    setEditRow(row)
    setEditForm({
      file_type:   normalizeKey(row.type || ''),
      status:      normalizeKey(row.status || ''),
      docket_date: row.docket_date || '',
      remarks:     row.remarks || '',
    })
    setEditError('')
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editRow) return
    setEditError('')
    if (!editForm.file_type) { setEditError('File type is required'); return }
    if (!editForm.status)    { setEditError('Status is required'); return }

    setUpdating(true)
    try {
      await filesApi.update(editRow.id, {
        file_type:   editForm.file_type,
        status:      editForm.status,
        docket_date: editForm.docket_date || null,
        remarks:     editForm.remarks || null,
      })
      showBanner('ok', `File ${editRow.file_number} updated!`)
      setEditOpen(false)
      loadFiles()
    } catch (e: any) {
      setEditError(e?.response?.data?.detail || e?.message || 'Failed to update file')
    } finally {
      setUpdating(false)
    }
  }



  // ── Inline field helpers ──────────────────────────────────────────────────

  const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Banner ── */}
      {banner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          background: banner.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${banner.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderRadius: 10, padding: '10px 16px',
          color: banner.type === 'ok' ? '#166534' : '#be123c',
          fontSize: 13.5, fontWeight: 500,
        }}>
          {banner.type === 'ok' ? '✓' : '✕'} {banner.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={20} color="#2563eb" /> Files
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0' }}>
            All loan &amp; insurance files — create, update, and manage records
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setCreateForm({ ...EMPTY_FORM }); setCreateError(''); setCreateOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> New File
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180, maxWidth: 300 }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="form-input"
            placeholder="Search file#, customer, bank…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, height: 36 }}
          />
        </div>

        {/* File type filter */}
        <div style={{ position: 'relative' }}>
          <Filter size={13} color="#94a3b8" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
          <select
            className="form-select"
            style={{ paddingLeft: 28, height: 36, minWidth: 150 }}
            value={typeF}
            onChange={e => setTypeF(e.target.value)}
          >
            <option value="">All Types</option>
            {FILE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <select
          className="form-select"
          style={{ height: 36, minWidth: 160 }}
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {/* Refresh */}
        <button
          className="btn btn-outline btn-sm"
          onClick={loadFiles}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px' }}
          title="Refresh"
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 10, padding: '10px 14px', color: '#be123c', fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['File #', 'Customer', 'Type', 'Status', 'Bank', 'Docket Date', 'Assigned', 'Created', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '11px 14px', textAlign: 'left',
                  fontSize: '.71rem', fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
                  Loading files…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <FolderOpen size={32} color="#cbd5e1" />
                    <div style={{ color: '#64748b', fontWeight: 600, fontSize: 14 }}>No files found</div>
                    <div style={{ color: '#94a3b8', fontSize: 12 }}>
                      {search || typeF || statusF ? 'Try adjusting your filters.' : 'Create your first file using the button above.'}
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {!loading && filtered.map((r, i) => (
              <tr
                key={r.id}
                style={{
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* File # */}
                <td style={{ padding: '11px 14px' }}>
                  <span
                    style={{
                      fontWeight: 700, fontSize: '.82rem', color: '#2563eb',
                      cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '.3px',
                    }}
                    onClick={() => setDrawerFileId(r.id)}
                    title="View detail"
                  >
                    {r.file_number || '—'}
                  </span>
                </td>

                {/* Customer */}
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="#94a3b8" />
                    <span style={{ fontSize: '.84rem', fontWeight: 500, color: '#1e293b' }}>
                      {r.customer || '—'}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 600, color: '#64748b' }}>
                    {fmtType(normalizeKey(r.type || ''))}
                  </span>
                </td>

                {/* Status */}
                <td style={{ padding: '11px 14px' }}>
                  <StatusBadge status={r.status || 'draft'} />
                </td>

                {/* Bank */}
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Building2 size={12} color="#94a3b8" />
                    <span style={{ fontSize: '.8rem', color: '#475569' }}>{r.bank || '—'}</span>
                  </div>
                </td>

                {/* Docket Date */}
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={12} color="#94a3b8" />
                    <span style={{ fontSize: '.8rem', color: '#475569' }}>{r.docket_date || '—'}</span>
                  </div>
                </td>

                {/* Assigned */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.8rem', color: '#64748b' }}>{r.assigned || 'Unassigned'}</span>
                </td>

                {/* Created */}
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: '.78rem', color: '#94a3b8' }}>{r.created || '—'}</span>
                </td>

                {/* Actions */}
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => openEdit(r)}
                      style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all .15s',
                      }}
                      title="Edit file"
                    >
                      <Edit2 size={13} />
                    </button>

                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '9px 14px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8' }}>
            Showing {filtered.length} of {total} file{total !== 1 ? 's' : ''}
            {(search || typeF || statusF) && ' (filtered)'}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && (() => {
          const totalPages = Math.ceil(total / ROWS_PER_PAGE)
          return (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button
                className="btn btn-outline btn-sm"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                Page {page} of {totalPages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                Next
              </button>
            </div>
          )
        })()}
      </div>

      {/* ── CREATE MODAL ─────────────────────────────────────────────────────── */}
      {createOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: 16,
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520,
              boxShadow: '0 24px 60px rgba(15,23,42,.22)', overflow: 'hidden',
              animation: 'modalIn .2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="#2563eb" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Create New File</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>File number will be auto-generated</div>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>

              {createError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '9px 12px', color: '#be123c', fontSize: 13 }}>
                  {createError}
                </div>
              )}

              {/* Customer */}
              <FormField label="Customer" required>
                <select
                  className="form-input"
                  value={createForm.customer_id}
                  onChange={e => setCreateForm(f => ({ ...f, customer_id: e.target.value }))}
                >
                  <option value="">— Select Customer —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.mobile_1})</option>
                  ))}
                </select>
              </FormField>

              {/* Bank */}
              <FormField label="Finance Bank" required>
                <select
                  className="form-input"
                  value={createForm.bank_id}
                  onChange={e => setCreateForm(f => ({ ...f, bank_id: e.target.value }))}
                >
                  <option value="">— Select Bank —</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.bank_name}{b.area ? ` — ${b.area}` : ''}</option>
                  ))}
                </select>
              </FormField>

              {/* Type + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="File Type" required>
                  <select
                    className="form-input"
                    value={createForm.file_type}
                    onChange={e => setCreateForm(f => ({ ...f, file_type: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {FILE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>

                <FormField label="Status" required>
                  <select
                    className="form-input"
                    value={createForm.status}
                    onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Docket Date */}
              <FormField label="Docket Date">
                <input
                  type="date"
                  className="form-input"
                  value={createForm.docket_date}
                  onChange={e => setCreateForm(f => ({ ...f, docket_date: e.target.value }))}
                />
              </FormField>

              {/* Remarks */}
              <FormField label="Remarks">
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Any additional notes…"
                  value={createForm.remarks}
                  onChange={e => setCreateForm(f => ({ ...f, remarks: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: 60 }}
                />
              </FormField>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleCreate}
                disabled={creating}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {creating ? 'Creating…' : <><Plus size={14} /> Create File</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ───────────────────────────────────────────────────────── */}
      {editOpen && editRow && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: 16,
          }}
          onClick={() => setEditOpen(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480,
              boxShadow: '0 24px 60px rgba(15,23,42,.22)', overflow: 'hidden',
              animation: 'modalIn .2s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={16} color="#ca8a04" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>
                    Edit — <span style={{ color: '#2563eb', fontFamily: 'monospace' }}>{editRow.file_number}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Customer: {editRow.customer}</div>
                </div>
              </div>
              <button onClick={() => setEditOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {editError && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '9px 12px', color: '#be123c', fontSize: 13 }}>
                  {editError}
                </div>
              )}

              {/* Type + Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField label="File Type" required>
                  <select
                    className="form-input"
                    value={editForm.file_type}
                    onChange={e => setEditForm(f => ({ ...f, file_type: e.target.value }))}
                  >
                    <option value="">— Select —</option>
                    {FILE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>

                <FormField label="Status" required>
                  <select
                    className="form-input"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Docket Date */}
              <FormField label="Docket Date">
                <input
                  type="date"
                  className="form-input"
                  value={editForm.docket_date}
                  onChange={e => setEditForm(f => ({ ...f, docket_date: e.target.value }))}
                />
              </FormField>

              {/* Remarks */}
              <FormField label="Remarks">
                <textarea
                  className="form-input"
                  rows={2}
                  value={editForm.remarks}
                  onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))}
                  style={{ resize: 'vertical', minHeight: 60 }}
                />
              </FormField>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUpdate}
                disabled={updating}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(.96) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
    </div>
  )
}
