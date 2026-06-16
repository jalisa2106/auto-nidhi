import { useEffect, useState } from 'react'
import { message } from 'antd'
import {
  Plus, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Landmark, RotateCcw, Star,
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { bankAccountsApi } from '../../api/services'

// ── Types ────────────────────────────────────────────────────────────────────

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  ifsc_code: string
  area: string | null
  account_holder_name: string | null
  branch_name: string | null
  upi_id: string | null
  is_primary: boolean
  notes: string | null
}

const EMPTY_FORM = {
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  area: '',
  account_holder_name: '',
  branch_name: '',
  upi_id: '',
  is_primary: false,
  notes: '',
}
type FormState = typeof EMPTY_FORM

// ── IFSC Badge ───────────────────────────────────────────────────────────────

function IFSCBadge({ code }: { code: string }) {
  return (
    <span style={{
      fontFamily: 'monospace', fontSize: '.82rem',
      background: 'var(--brand-50)', color: 'var(--brand-700)',
      padding: '2px 8px', borderRadius: 6, fontWeight: 600, letterSpacing: '.3px',
    }}>
      {code}
    </span>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ total, page, pageSize, onPage, onPageSize }: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="pagination-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pagination-info">Showing {start}–{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[5, 10, 20].map(s => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, i, arr) => {
            if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) => p === '...'
            ? <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
            : <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
          )
        }
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const [rows, setRows] = useState<BankAccount[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [search, setSearch] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────

  async function loadBanks() {
    try {
      const res = await bankAccountsApi.list(page, pageSize)
      let data: BankAccount[] = res.data || []
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        data = data.filter(b =>
          b.bank_name.toLowerCase().includes(q) ||
          b.account_number.toLowerCase().includes(q) ||
          b.ifsc_code.toLowerCase().includes(q) ||
          (b.area || '').toLowerCase().includes(q) ||
          (b.account_holder_name || '').toLowerCase().includes(q) ||
          (b.branch_name || '').toLowerCase().includes(q) ||
          (b.upi_id || '').toLowerCase().includes(q)
        )
      }
      setRows(data)
      setTotalRows(search ? data.length : res.total)
    } catch {
      message.error('Failed to load bank accounts')
    }
  }

  useEffect(() => { loadBanks() }, [page, pageSize, search])

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openAdd() {
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setShowModal(true)
  }

  function openEdit(b: BankAccount) {
    setEditId(b.id)
    setForm({
      bank_name: b.bank_name,
      account_number: b.account_number,
      ifsc_code: b.ifsc_code,
      area: b.area || '',
      account_holder_name: b.account_holder_name || '',
      branch_name: b.branch_name || '',
      upi_id: b.upi_id || '',
      is_primary: b.is_primary,
      notes: b.notes || '',
    })
    setErrors({})
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setErrors({})
  }

  function setField(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key as string]) setErrors(prev => { const n = { ...prev }; delete n[key as string]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.bank_name.trim()) e.bank_name = 'Bank name is required'
    if (!form.account_number.trim()) e.account_number = 'Account number is required'
    else if (form.account_number.trim().length < 9 || form.account_number.trim().length > 18)
      e.account_number = 'Account number must be between 9 and 18 digits'
    const ifsc = form.ifsc_code.trim().toUpperCase()
    if (!ifsc) e.ifsc_code = 'IFSC code is required'
    else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) e.ifsc_code = 'Invalid IFSC format (e.g. HDFC0001234)'
    if (form.upi_id.trim() && !/^[\w.\-]+@[\w.\-]+$/.test(form.upi_id.trim()))
      e.upi_id = 'Invalid UPI ID format (e.g. autonidhi@hdfc)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const payload: any = {
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.trim(),
      ifsc_code: form.ifsc_code.trim().toUpperCase(),
      area: form.area.trim() || undefined,
      account_holder_name: form.account_holder_name.trim() || undefined,
      branch_name: form.branch_name.trim() || undefined,
      upi_id: form.upi_id.trim() || undefined,
      is_primary: form.is_primary,
      notes: form.notes.trim() || undefined,
    }
    try {
      if (editId) {
        await bankAccountsApi.update(editId, payload)
        message.success('Bank account updated successfully')
      } else {
        await bankAccountsApi.create(payload)
        message.success('Bank account added successfully')
      }
      closeModal()
      loadBanks()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') message.error(detail)
      else message.error('Failed to save bank account')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      await bankAccountsApi.remove(deleteId)
      message.success('Bank account removed successfully')
      setDeleteId(null)
      loadBanks()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'Cannot remove this bank account.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Company Bank Accounts"
        subtitle="Manage accounts used for inward and outward payment mapping"
      />

      {/* ── Filter / Action Bar ── */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="bank-search"
            className="pay-filter-input"
            placeholder="Bank name, account number, IFSC, UPI ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        {search && (
          <button className="pay-filter-reset" onClick={() => { setSearch(''); setPage(1) }} title="Clear">
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button
          id="bank-add-btn"
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={openAdd}
        >
          <Plus size={14} /> Add Bank Account
        </button>
      </div>

      {/* ── Table ── */}
      <div className="data-card">
        {rows.length === 0 ? (
          <div className="data-empty">
            {search ? 'No bank accounts match your search.' : 'No bank accounts added yet. Click "Add Bank Account" to get started.'}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bank Name</th>
                    <th>Account Holder</th>
                    <th>Account Number</th>
                    <th>IFSC Code</th>
                    <th>Branch</th>
                    <th>UPI ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: b.is_primary ? '#fef9c3' : 'var(--brand-50)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {b.is_primary
                              ? <Star size={15} color="#ca8a04" fill="#ca8a04" />
                              : <Landmark size={15} color="var(--brand-600)" />
                            }
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{b.bank_name}</div>
                            {b.is_primary && (
                              <span style={{
                                fontSize: '.68rem', fontWeight: 700, color: '#92400e',
                                background: '#fef9c3', padding: '1px 6px', borderRadius: 4,
                              }}>PRIMARY</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-600)' }}>
                        {b.account_holder_name || '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '.9rem', color: 'var(--gray-700)' }}>
                        {b.account_number}
                      </td>
                      <td><IFSCBadge code={b.ifsc_code} /></td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-500)' }}>
                        {b.branch_name || b.area || '—'}
                      </td>
                      <td style={{ fontSize: '.82rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                        {b.upi_id || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px' }}
                            title="Edit"
                            onClick={() => openEdit(b)}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ padding: '5px 10px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}
                            title="Remove"
                            onClick={() => setDeleteId(b.id)}
                          >
                            <Trash2 size={13} />
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

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? 'Edit Bank Account' : 'Add Bank Account'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); handleSave() }}>
              <div className="modal-body">
                <div className="modal-grid-2">

                  {/* Bank Name */}
                  <div className="form-group modal-full">
                    <label className="form-label">
                      Bank Name <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="bank-name-input"
                      className={`form-input${errors.bank_name ? ' error' : ''}`}
                      placeholder="e.g. HDFC Bank"
                      value={form.bank_name}
                      onChange={e => setField('bank_name', e.target.value)}
                    />
                    {errors.bank_name && <span className="form-error">{errors.bank_name}</span>}
                  </div>

                  {/* Account Holder Name */}
                  <div className="form-group modal-full">
                    <label className="form-label">Account Holder Name</label>
                    <input
                      id="bank-holder-input"
                      className="form-input"
                      placeholder="e.g. AutoNidhi Finance Pvt Ltd"
                      value={form.account_holder_name}
                      onChange={e => setField('account_holder_name', e.target.value)}
                    />
                  </div>

                  {/* Account Number */}
                  <div className="form-group modal-full">
                    <label className="form-label">
                      Account Number <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="bank-account-no-input"
                      className={`form-input${errors.account_number ? ' error' : ''}`}
                      placeholder="e.g. 50100123456789"
                      value={form.account_number}
                      onChange={e => setField('account_number', e.target.value)}
                    />
                    {errors.account_number && <span className="form-error">{errors.account_number}</span>}
                  </div>

                  {/* IFSC Code */}
                  <div className="form-group">
                    <label className="form-label">
                      IFSC Code <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input
                      id="bank-ifsc-input"
                      className={`form-input${errors.ifsc_code ? ' error' : ''}`}
                      placeholder="e.g. HDFC0001234"
                      value={form.ifsc_code}
                      onChange={e => setField('ifsc_code', e.target.value.toUpperCase())}
                      maxLength={11}
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                    />
                    {errors.ifsc_code && <span className="form-error">{errors.ifsc_code}</span>}
                  </div>

                  {/* Branch Name */}
                  <div className="form-group">
                    <label className="form-label">Branch Name</label>
                    <input
                      id="bank-branch-input"
                      className="form-input"
                      placeholder="e.g. HDFC Bank, Rajkot Main Branch"
                      value={form.branch_name}
                      onChange={e => setField('branch_name', e.target.value)}
                    />
                  </div>

                  {/* UPI ID */}
                  <div className="form-group">
                    <label className="form-label">UPI ID</label>
                    <input
                      id="bank-upi-input"
                      className={`form-input${errors.upi_id ? ' error' : ''}`}
                      placeholder="e.g. autonidhi@hdfc"
                      value={form.upi_id}
                      onChange={e => setField('upi_id', e.target.value)}
                      style={{ fontFamily: 'monospace' }}
                    />
                    {errors.upi_id && <span className="form-error">{errors.upi_id}</span>}
                  </div>

                  {/* Area */}
                  <div className="form-group">
                    <label className="form-label">Area / City</label>
                    <input
                      id="bank-area-input"
                      className="form-input"
                      placeholder="e.g. Rajkot, Gujarat"
                      value={form.area}
                      onChange={e => setField('area', e.target.value)}
                    />
                  </div>

                  {/* Is Primary toggle */}
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 24 }}>
                    <input
                      id="bank-primary-toggle"
                      type="checkbox"
                      checked={form.is_primary}
                      onChange={e => setField('is_primary', e.target.checked)}
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-600)' }}
                    />
                    <label htmlFor="bank-primary-toggle" style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--gray-700)', fontSize: '.88rem' }}>
                      <Star size={13} style={{ marginRight: 4, color: '#ca8a04', verticalAlign: 'text-top' }} />
                      Mark as Primary Bank Account
                    </label>
                  </div>

                  {/* Notes */}
                  <div className="form-group modal-full">
                    <label className="form-label">Internal Notes</label>
                    <textarea
                      id="bank-notes-input"
                      className="form-input"
                      placeholder="Optional internal notes about this account (purpose, restrictions, etc.)"
                      value={form.notes}
                      onChange={e => setField('notes', e.target.value)}
                      rows={2}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>Cancel</button>
                <button type="submit" id="bank-save-btn" className="btn btn-primary btn-sm" disabled={saving}>
                  <Plus size={14} />
                  {saving ? 'Saving…' : editId ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Remove Confirmation Modal ── */}
      {deleteId && (
        <div className="modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Remove Bank Account</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.6, margin: 0 }}>
                Are you sure you want to remove this bank account?
                <br /><br />
                This will remove the record from active lists. Historical data and linked financial ledgers will remain intact in the archives.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setDeleteId(null)}>Cancel</button>
              <button
                id="bank-delete-confirm-btn"
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 size={14} />
                {deleting ? 'Removing…' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}