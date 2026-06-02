import { useEffect, useState } from 'react'
import { message } from 'antd'
import {
  Plus, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Landmark, RotateCcw,
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
}

const EMPTY_FORM = {
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  area: '',
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
          {[10, 20, 50].map(s => <option key={s} value={s}>{s} / page</option>)}
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
  const [pageSize, setPageSize] = useState(10)
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
      // Client-side search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        data = data.filter(b =>
          b.bank_name.toLowerCase().includes(q) ||
          b.account_number.toLowerCase().includes(q) ||
          b.ifsc_code.toLowerCase().includes(q) ||
          (b.area || '').toLowerCase().includes(q)
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

  function setField(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
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
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const payload = {
      bank_name: form.bank_name.trim(),
      account_number: form.account_number.trim(),
      ifsc_code: form.ifsc_code.trim().toUpperCase(),
      area: form.area.trim() || undefined,
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

  const filteredRows = rows

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
            placeholder="Bank name, account number, IFSC, area…"
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
        {filteredRows.length === 0 ? (
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
                    <th>Account Number</th>
                    <th>IFSC Code</th>
                    <th>Area / Branch</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((b, i) => (
                    <tr key={b.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'var(--brand-50)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Landmark size={15} color="var(--brand-600)" />
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{b.bank_name}</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '.9rem', color: 'var(--gray-700)' }}>
                        {b.account_number}
                      </td>
                      <td><IFSCBadge code={b.ifsc_code} /></td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-500)' }}>
                        {b.area || '—'}
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
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
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

                  {/* Area */}
                  <div className="form-group">
                    <label className="form-label">Area / Branch</label>
                    <input
                      id="bank-area-input"
                      className="form-input"
                      placeholder="e.g. Shivaji Nagar, Pune"
                      value={form.area}
                      onChange={e => setField('area', e.target.value)}
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

      {/* ── Remove Confirmation Modal (Soft Delete) ── */}
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