import { useEffect, useMemo, useState } from 'react'
import {
  TrendingDown, IndianRupee, CalendarClock, Plus, X, Eye,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
} from 'lucide-react'
import { message } from 'antd'
import PageHeader from '../../components/app/PageHeader'
import { commissionsInApi, filesApi, bankAccountsApi } from '../../api/services'

// ─── Types ────────────────────────────────────────────────────────────────
type CommissionIn = {
  id: string
  file_id?: string
  file_number: string
  source_type: string
  source_name: string
  amount: number
  advance: boolean
  tds_deducted: boolean
  mode: string
  payment_date: string
  cheque_bank_name?: string | null
  branch_name?: string | null
  cheque_no?: string | null
  cheque_date?: string | null
  utr_no?: string | null
  company_bank_id?: string | null
  remarks?: string | null
}

const PAYMENT_MODES   = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const SOURCE_TYPES    = ['Bank', 'Insurer', 'Financier', 'Other'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

function thisMonthRange() {
  const now  = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to   = now.toISOString().slice(0, 10)
  return { from, to }
}

function modeBadge(mode: string) {
  const cls: Record<string, string> = {
    UPI: 'mode-upi', NEFT: 'mode-neft', RTGS: 'mode-rtgs',
    Cheque: 'mode-cheque', Cash: 'mode-cash', DD: 'mode-dd',
  }
  return <span className={`mode-badge ${cls[mode] ?? 'mode-other'}`}>{mode}</span>
}

function sourceBadge(type: string) {
  const cls: Record<string, string> = {
    Bank: 'from-dealer',
    Insurer: 'from-broker',
    Financier: 'from-agent',
    Other: 'from-other',
  }
  return <span className={`from-badge ${cls[type] ?? 'from-other'}`}>{type}</span>
}

function advancePill(val: boolean) {
  return val
    ? <span className="mode-badge mode-cheque">Advance</span>
    : <span className="mode-badge mode-cash">Final</span>
}

// ─── Empty form ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  file_number:      '',
  source_type:      'Bank' as string,
  source_name:      '',
  amount:           '',
  advance:          false,
  tds_tracked:      false,
  mode:             'UPI' as string,
  payment_date:     new Date().toISOString().slice(0, 10),
  company_bank_id:  '',
  cheque_bank_name: '',
  branch_name:      '',
  cheque_no:        '',
  cheque_date:      '',
  utr_no:           '',
  remarks:          '',
}

// ─── Pagination Component ──────────────────────────────────────────────────
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
          {[10, 20, 50].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First">
          <ChevronsLeft size={14} />
        </button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Previous">
          <ChevronLeft size={14} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
          ) : (
            <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>
              {p}
            </button>
          )
        )}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next">
          <ChevronRight size={14} />
        </button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page Component ───────────────────────────────────────────────────
export default function CommissionInPage() {
  const [rows, setRows]         = useState<CommissionIn[]>([])
  const [availableFiles, setAvailableFiles] = useState<any[]>([])
  const [companyBanks, setCompanyBanks] = useState<{ id: string; label: string }[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [viewRow, setViewRow]   = useState<CommissionIn | null>(null)
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [errors, setErrors]     = useState<Record<string, string>>({})

  // Multi-Filter Configurations
  const [search, setSearch]                   = useState('')
  const [filterType, setFilterType]           = useState('')
  const [filterMode, setFilterMode]           = useState('')
  const [filterDateFrom, setFilterDateFrom]   = useState('')
  const [filterDateTo, setFilterDateTo]       = useState('')

  // Pagination Configuration
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // ── Derived Client Filter Data Flow ──────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.file_number.toLowerCase().includes(q) &&
          !r.source_name.toLowerCase().includes(q) &&
          !(r.remarks ?? '').toLowerCase().includes(q)
        ) return false
      }
      if (filterType && r.source_type !== filterType) return false
      if (filterMode && r.mode        !== filterMode) return false
      if (filterDateFrom && r.payment_date < filterDateFrom) return false
      if (filterDateTo   && r.payment_date > filterDateTo)   return false
      return true
    })
  }, [rows, search, filterType, filterMode, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── KPI Metrics Computing ─────────────────────────────────────────────────
  const kpiTotal    = rows.reduce((s, r) => s + r.amount, 0)
  const kpiAdvance  = rows.filter((r) => r.advance).reduce((s, r) => s + r.amount, 0)
  const { from: mFrom, to: mTo } = thisMonthRange()
  const kpiMonth    = rows.filter((r) => r.payment_date >= mFrom && r.payment_date <= mTo)
                         .reduce((s, r) => s + r.amount, 0)

  // ── Form Conditional Triggers ─────────────────────────────────────────────
  const isChequeLike = form.mode === 'Cheque' || form.mode === 'DD'
  const isTransfer   = form.mode === 'NEFT'   || form.mode === 'RTGS'

  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)

  const loadCommissions = async () => {
    try {
      // keep the existing UI pagination/filtering behavior client-side
      const res = await commissionsInApi.list({ page: 1, limit: 5000 })
      setRows(res.data || [])
      setPage(1)
    } catch (err) {
      message.error('Failed to load commissions')
    }
  }

  const loadFilesDropdown = async () => {
    try {
      const response = await filesApi.list(1, 1000)
      setAvailableFiles(response.data || [])
    } catch (err) { }
  }

  useEffect(() => {
    loadCommissions()
    // Load banks once on mount so the dropdown is always ready
    bankAccountsApi.list(1, 200).then(res => {
      setCompanyBanks((res.data || []).map((b: any) => ({
        id: b.id,
        label: `${b.bank_name} – ${b.account_number}`,
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (showAdd) loadFilesDropdown()
  }, [showAdd])

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.file_number)               e.file_number  = 'File reference is required'
    if (!form.source_type)               e.source_type  = 'Select commission source type'
    if (!form.source_name.trim())        e.source_name  = 'Source provider name is required'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid incoming amount'
    if (!form.mode)                      e.mode         = 'Select payment channel mode'
    if (!form.payment_date)              e.payment_date = 'Select deposit collection date'
    if (isChequeLike && !form.cheque_no) e.cheque_no    = 'Cheque / DD number reference required'
    if (isTransfer   && !form.utr_no)    e.utr_no       = 'UTR reference transaction string required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd() {
    if (!validate()) return
    const payload = {
      file_id: form.file_number, // stores file UUID from dropdown
      source_type: form.source_type,
      source_name: form.source_name.trim(),
      amount: Number(form.amount),
      advance: form.advance,
      tds_deducted: form.tds_tracked,
      mode: form.mode,
      payment_date: form.payment_date,
      cheque_bank_name: form.cheque_bank_name || null,
      branch_name: form.branch_name || null,
      cheque_no: form.cheque_no || null,
      cheque_date: form.cheque_date || null,
      utr_no: form.utr_no || null,
      company_bank_id: form.company_bank_id || null,
      remarks: form.remarks || null,
    }

    try {
      await commissionsInApi.create(payload)
      message.success('Commission recorded successfully')
      setForm({ ...EMPTY_FORM })
      setErrors({})
      setShowAdd(false)
      loadCommissions()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to save commission')
    }
  }

  function resetFilters() {
    setSearch(''); setFilterType(''); setFilterMode('')
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1)
  }

  const hasFilters = search || filterType || filterMode || filterDateFrom || filterDateTo

  return (
    <>
      <PageHeader title="Commission IN" subtitle="Commission payouts from dealers, brokers & agents linked to files" />

      {/* KPI Display Metrics Bar */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green"><TrendingDown size={20} style={{ transform: 'rotate(180deg)' }} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Commission Received</div>
            <div className="pay-kpi-value" style={{ color: '#137333' }}>{fmtINR(kpiTotal)}</div>
            <div className="pay-kpi-sub">{rows.length} transactions all-time</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon amber"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Advance Receivables</div>
            <div className="pay-kpi-value" style={{ color: '#b45309' }}>{fmtINR(kpiAdvance)}</div>
            <div className="pay-kpi-sub">
              {rows.filter((r) => r.advance).length} advance transactions
            </div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><CalendarClock size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">This Month</div>
            <div className="pay-kpi-value">{fmtINR(kpiMonth)}</div>
            <div className="pay-kpi-sub">
              {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Parameter Search/Filter Toolbar Layout */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="comm-in-search"
            className="pay-filter-input"
            placeholder="File no., source name, remarks…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Source Type</span>
          <select
            id="comm-in-type-filter"
            className="pay-filter-input"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          >
            <option value="">All types</option>
            {SOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Mode</span>
          <select
            id="comm-in-mode-filter"
            className="pay-filter-input"
            value={filterMode}
            onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}
          >
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date From</span>
          <input
            id="comm-in-date-from"
            type="date" className="pay-filter-input"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
          />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input
            id="comm-in-date-to"
            type="date" className="pay-filter-input"
            value={filterDateTo}
            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }}
          />
        </div>
        {hasFilters && (
          <button className="pay-filter-reset" onClick={resetFilters} title="Clear filters">
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button
          id="comm-in-add-btn"
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => setShowAdd(true)}
        >
          <Plus size={14} /> Add Commission IN
        </button>
      </div>

      {/* Structured Ledger Layout Data Grid Grid */}
      <div className="data-card">
        {filtered.length === 0 ? (
          <div className="data-empty">No commission records match your filters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>File No.</th>
                    <th>Source Type</th>
                    <th>Source Name</th>
                    <th>Amount (₹)</th>
                    <th>Status</th>
                    <th>TDS</th>
                    <th>Mode</th>
                    <th>Date</th>
                    <th>Cheque / UTR</th>
                    <th>Remarks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(safePage - 1) * pageSize + i + 1}
                      </td>
                      <td><span className="db-file-id">{r.file_number}</span></td>
                      <td>{sourceBadge(r.source_type)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.source_name}</td>
                      <td className="amt-positive" style={{ color: '#137333', fontWeight: 600 }}>{fmtINR(r.amount)}</td>
                      <td>{advancePill(r.advance)}</td>
                      <td>
                        {r.tds_deducted
                          ? <span className="mode-badge mode-neft">TDS ✓</span>
                          : <span style={{ color: 'var(--gray-400)', fontSize: '.78rem' }}>—</span>
                        }
                      </td>
                      <td>{modeBadge(r.mode)}</td>
                      <td style={{ fontSize: '.84rem', color: 'var(--gray-600)' }}>{r.payment_date}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--gray-500)', fontFamily: 'monospace' }}>
                        {r.cheque_no || r.utr_no || '—'}
                      </td>
                      <td
                        style={{
                          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap', fontSize: '.82rem', color: 'var(--gray-500)',
                        }}
                        title={r.remarks ?? ''}
                      >
                        {r.remarks || '—'}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '5px 12px', fontSize: '.78rem' }}
                          onClick={() => setViewRow(r)}
                          title="View details"
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              total={filtered.length}
              page={safePage}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </>
        )}
      </div>

      {/* ── Add New Entry Modal Controller ── */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Commission IN</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd() }}>
              <div className="modal-body">
                <div className="modal-grid-2">

                  {/* ─ Section Header 1 ─ */}
                  <div className="modal-section-label">File &amp; Inward Payee Info</div>

                  <div className="form-group">
                    <label className="form-label">File <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-in-file"
                      className={`form-input ${errors.file_number ? 'error' : ''}`}
                      value={form.file_number}
                      onChange={(e) => updateForm('file_number', e.target.value)}
                    >
                      <option value="">Select file…</option>
                      {availableFiles.map((f) => (
                        <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                      ))}
                    </select>
                    {errors.file_number && <span className="form-error">{errors.file_number}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Source Type <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-in-source-type"
                      className={`form-input ${errors.source_type ? 'error' : ''}`}
                      value={form.source_type}
                      onChange={(e) => updateForm('source_type', e.target.value)}
                    >
                      {SOURCE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {errors.source_type && <span className="form-error">{errors.source_type}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Source Corporate Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="comm-in-source-name"
                      className={`form-input ${errors.source_name ? 'error' : ''}`}
                      placeholder="e.g. HDFC Finance Corp, ICICI Lombard, Insurance Provider Co…"
                      value={form.source_name}
                      onChange={(e) => updateForm('source_name', e.target.value)}
                    />
                    {errors.source_name && <span className="form-error">{errors.source_name}</span>}
                  </div>

                  {/* ─ Section Header 2 ─ */}
                  <div className="modal-section-label">Amount &amp; Flags</div>

                  <div className="form-group">
                    <label className="form-label">Commission Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="comm-in-amount"
                      type="number" min="0" step="0.01"
                      className={`form-input ${errors.amount ? 'error' : ''}`}
                      placeholder="e.g. 15000"
                      value={form.amount}
                      onChange={(e) => updateForm('amount', e.target.value)}
                    />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end' }}>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        id="comm-in-advance"
                        type="checkbox"
                        style={{ accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                        checked={form.advance}
                        onChange={(e) => updateForm('advance', e.target.checked)}
                      />
                      Paid as Advance
                      <span style={{ fontSize: '.73rem', color: 'var(--gray-400)', fontWeight: 400 }}>
                        (before transaction completion)
                      </span>
                    </label>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        id="comm-in-tds"
                        type="checkbox"
                        style={{ accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                        checked={form.tds_tracked}
                        onChange={(e) => updateForm('tds_tracked', e.target.checked)}
                      />
                      TDS Deducted / Tracked
                    </label>
                  </div>

                  {/* ─ Section Header 3 ─ */}
                  <div className="modal-section-label">Payment Mode &amp; Date</div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-in-mode"
                      className={`form-input ${errors.mode ? 'error' : ''}`}
                      value={form.mode}
                      onChange={(e) => updateForm('mode', e.target.value)}
                    >
                      {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    {errors.mode && <span className="form-error">{errors.mode}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="comm-in-date"
                      type="date"
                      className={`form-input ${errors.payment_date ? 'error' : ''}`}
                      value={form.payment_date}
                      onChange={(e) => updateForm('payment_date', e.target.value)}
                    />
                    {errors.payment_date && <span className="form-error">{errors.payment_date}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Destination Company Bank Account</label>
                    <select
                      id="comm-in-bank"
                      className="form-input"
                      value={form.company_bank_id}
                      onChange={(e) => updateForm('company_bank_id', e.target.value)}
                    >
                      <option value="">— Select account —</option>
                      {companyBanks.length === 0
                        ? <option disabled>No bank accounts — add in Settings</option>
                        : companyBanks.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)
                      }
                    </select>
                  </div>

                  {/* ─ Section Header 4 (Sub-Conditional Fields) ─ */}
                  {isChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {form.mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="comm-in-cheque-no"
                          className={`form-input ${errors.cheque_no ? 'error' : ''}`}
                          placeholder="e.g. CHQ778899"
                          value={form.cheque_no}
                          onChange={(e) => updateForm('cheque_no', e.target.value)}
                        />
                        {errors.cheque_no && <span className="form-error">{errors.cheque_no}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque Date</label>
                        <input
                          id="comm-in-cheque-date"
                          type="date" className="form-input"
                          value={form.cheque_date}
                          onChange={(e) => updateForm('cheque_date', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Issuing Bank Name</label>
                        <input
                          id="comm-in-cheque-bank"
                          className="form-input"
                          placeholder="e.g. HDFC Bank"
                          value={form.cheque_bank_name}
                          onChange={(e) => updateForm('cheque_bank_name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          id="comm-in-branch"
                          className="form-input"
                          placeholder="e.g. Anand Main Branch"
                          value={form.branch_name}
                          onChange={(e) => updateForm('branch_name', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {isTransfer && (
                    <>
                      <div className="modal-section-label">Transfer Details</div>
                      <div className="form-group modal-full">
                        <label className="form-label">UTR / Reference No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="comm-in-utr"
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. RTGS20260525114"
                          value={form.utr_no}
                          onChange={(e) => updateForm('utr_no', e.target.value)}
                        />
                        {errors.utr_no && <span className="form-error">{errors.utr_no}</span>}
                      </div>
                    </>
                  )}

                  {/* ─ Section Header 5 ─ */}
                  <div className="modal-section-label">Additional Notes</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Remarks</label>
                    <textarea
                      id="comm-in-remarks"
                      className="form-input"
                      rows={2}
                      placeholder="Optional notes about this incoming commission payout…"
                      value={form.remarks}
                      onChange={(e) => updateForm('remarks', e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm"
                  onClick={() => { setShowAdd(false); setErrors({}) }}>
                  Cancel
                </button>
                <button type="submit" id="comm-in-save-btn" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Save Commission IN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detailed Row Inspection Drawer Modal ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Commission IN — {viewRow.id}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File No.</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Source Type</div>
                  <div className="pay-detail-val">{sourceBadge(viewRow.source_type)}</div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Source Name</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>{viewRow.source_name}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Commission Amount</div>
                  <div className="pay-detail-val" style={{ color: '#137333', fontWeight: 600 }}>{fmtINR(viewRow.amount)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Status</div>
                  <div className="pay-detail-val">{advancePill(viewRow.advance)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">TDS Tracked</div>
                  <div className="pay-detail-val">
                    {viewRow.tds_deducted ? <span className="mode-badge mode-neft">Yes</span> : <span style={{ color: 'var(--gray-400)' }}>No</span>}
                  </div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Mode</div>
                  <div className="pay-detail-val">{modeBadge(viewRow.mode)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Date</div>
                  <div className="pay-detail-val">{viewRow.payment_date}</div>
                </div>
                
                {(viewRow.cheque_no || viewRow.utr_no) && (
                  <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="pay-detail-key">Cheque / UTR Reference No.</div>
                    <div className="pay-detail-val" style={{ fontFamily: 'monospace' }}>
                      {viewRow.cheque_no || viewRow.utr_no}
                    </div>
                  </div>
                )}

                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Remarks</div>
                  <div className="pay-detail-val">{viewRow.remarks || '—'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
