import { useEffect, useMemo, useState } from 'react'
import {
  TrendingDown, IndianRupee, Plus, X, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  FileSpreadsheet, FileDown, CalendarClock,
} from 'lucide-react'
import { message, Select } from 'antd'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageHeader from '../../components/app/PageHeader'
import { filesApi, bankAccountsApi, usersSettingsApi, brokersApi, dealersApi, commissionsOutApi } from '../../api/services'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'
import FileDetailDrawer from '../../components/app/FileDetailDrawer'

// ─── Types ────────────────────────────────────────────────────────────────
type CommissionOut = {
  id: string
  file_id?: string
  file_number: string
  payee_type: string
  payee_name: string
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
  company_bank_label?: string | null
  remarks?: string | null
}

const PAYMENT_MODES   = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const PAYEE_TYPES     = ['Dealer', 'Broker', 'Other'] as const

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

function payeeBadge(type: string) {
  const cls: Record<string, string> = {
    Dealer: 'from-dealer', Broker: 'from-broker',
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
  payee_type:       'Dealer' as string,
  payee_name:       '',
  amount:           '',
  advance:          false,
  tds_deducted:     false,
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

// ─── Pagination ────────────────────────────────────────────────────────────
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

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function CommissionOutPage() {
  const [rows, setRows]         = useState<CommissionOut[]>([])
  const [availableFiles, setAvailableFiles] = useState<any[]>([])
  const [companyBanks, setCompanyBanks] = useState<{ id: string; label: string }[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [viewRow, setViewRow]   = useState<CommissionOut | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');
  const [editRow, setEditRow]   = useState<CommissionOut | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [staff, setStaff]       = useState<any[]>([])
  const [brokers, setBrokers]   = useState<any[]>([])
  const [dealers, setDealers]   = useState<any[]>([])

  // Filters
  const [search, setSearch]                   = useState('')
  const [filterType, setFilterType]           = useState('')
  const [filterMode, setFilterMode]           = useState('')
  const [filterDateFrom, setFilterDateFrom]   = useState('')
  const [filterDateTo, setFilterDateTo]       = useState('')

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null)

  const payeeOptions = useMemo(() => {
    if (form.payee_type === 'Broker') return brokers
    if (form.payee_type === 'Dealer') return dealers
    return staff
  }, [form.payee_type, staff, brokers, dealers])

  // ── Derived data ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !r.file_number.toLowerCase().includes(q) &&
          !r.payee_name.toLowerCase().includes(q) &&
          !(r.remarks ?? '').toLowerCase().includes(q)
        ) return false
      }
      if (filterType && r.payee_type !== filterType) return false
      if (filterMode && r.mode        !== filterMode) return false
      if (filterDateFrom && r.payment_date < filterDateFrom) return false
      if (filterDateTo   && r.payment_date > filterDateTo)   return false
      return true
    })
  }, [rows, search, filterType, filterMode, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpiTotal    = rows.reduce((s, r) => s + r.amount, 0)
  const kpiAdvance  = rows.filter((r) => r.advance).reduce((s, r) => s + r.amount, 0)
  const { from: mFrom, to: mTo } = thisMonthRange()
  const kpiMonth    = rows.filter((r) => r.payment_date >= mFrom && r.payment_date <= mTo)
                         .reduce((s, r) => s + r.amount, 0)

  // ── Form helpers ───────────────────────────────────────────────────────────
  const isChequeLike = form.mode === 'Cheque' || form.mode === 'DD'
  const isTransfer   = form.mode === 'NEFT'   || form.mode === 'RTGS'

  const loadCommissions = async () => {
    try {
      const res = await commissionsOutApi.list({ page: 1, limit: 5000 })
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
    // Load company banks once on mount
    bankAccountsApi.list(1, 200).then(res => {
      setCompanyBanks((res.data || []).map((b: any) => ({
        id: b.id,
        label: `${b.bank_name} – ${b.account_number}`,
      })))
    }).catch(() => {})

    // Load staff for payee dropdown
    usersSettingsApi.list(1, 500).then(res => {
      const allUsers = res.data || []
      const filtered = allUsers.filter((u: any) => {
        const r = (u.role_name || '').toLowerCase()
        const isActive = u.is_active === true
        // Show all active users except Customers
        return isActive && r !== 'customer'
      }).map((u: any) => ({
        label: `${u.first_name} ${u.last_name || ''}`.trim(),
        value: `${u.first_name} ${u.last_name || ''}`.trim()
      }))
      setStaff(filtered)
    }).catch(() => {})

    // Load brokers
    brokersApi.list().then(res => {
      setBrokers((res.data || []).map((b: any) => ({
        label: b.broker_name,
        value: b.broker_name
      })))
    }).catch(() => {})

    // Load dealers
    dealersApi.list().then(res => {
      setDealers((res.data || []).map((d: any) => ({
        label: `${d.showroom_name} (${d.name})`,
        value: `${d.showroom_name} (${d.name})`
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
    if (!form.file_number)               e.file_number  = 'File is required'
    if (!form.payee_type)                e.payee_type   = 'Select payee type'
    if (!form.payee_name.trim())         e.payee_name   = 'Payee name is required'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.mode)                      e.mode         = 'Select payment mode'
    if (!form.payment_date)              e.payment_date = 'Select date'
    if (isChequeLike && !form.cheque_no) e.cheque_no    = 'Cheque / DD number required'
    if (isTransfer   && !form.utr_no)   e.utr_no        = 'UTR / reference number required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd() {
    if (!validate()) return
    const payload = {
      file_id: form.file_number,
      payee_type: form.payee_type,
      payee_name: form.payee_name.trim(),
      amount: Number(form.amount),
      advance: form.advance,
      tds_deducted: form.tds_deducted,
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
      await commissionsOutApi.create(payload)
      message.success('Commission recorded successfully')
      setForm({ ...EMPTY_FORM })
      setErrors({})
      setShowAdd(false)
      loadCommissions()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to save commission')
    }
  }

  function openEdit(r: CommissionOut) {
    setEditRow(r)
    setEditForm({
      file_number: r.file_id || '',
      payee_type: r.payee_type || 'Dealer',
      payee_name: r.payee_name || '',
      amount: String(r.amount || ''),
      advance: r.advance || false,
      tds_deducted: r.tds_deducted || false,
      mode: r.mode || 'UPI',
      payment_date: r.payment_date || new Date().toISOString().slice(0, 10),
      company_bank_id: r.company_bank_id || '',
      cheque_bank_name: r.cheque_bank_name || '',
      branch_name: r.branch_name || '',
      cheque_no: r.cheque_no || '',
      cheque_date: r.cheque_date || '',
      utr_no: r.utr_no || '',
      remarks: r.remarks || '',
    })
  }

  async function handleEdit() {
    if (!editRow) return
    const payload: any = {
      payee_type: editForm.payee_type,
      payee_name: editForm.payee_name,
      amount: Number(editForm.amount),
      advance: editForm.advance,
      tds_deducted: editForm.tds_deducted,
      mode: editForm.mode,
      payment_date: editForm.payment_date,
      company_bank_id: editForm.company_bank_id || null,
      cheque_bank_name: editForm.cheque_bank_name || null,
      branch_name: editForm.branch_name || null,
      cheque_no: editForm.cheque_no || null,
      cheque_date: editForm.cheque_date || null,
      utr_no: editForm.utr_no || null,
      remarks: editForm.remarks || null,
    }
    try {
      await commissionsOutApi.update(editRow.id, payload)
      message.success('Commission updated')
      setEditRow(null)
      loadCommissions()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this commission? This cannot be undone.')) return
    try {
      await commissionsOutApi.remove(id)
      message.success('Commission deleted')
      loadCommissions()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  function resetFilters() {
    setSearch(''); setFilterType(''); setFilterMode('')
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1)
  }

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || filtered
    const data = list.map((r) => ({
      'File No.': r.file_number,
      'Payee Type': r.payee_type,
      'Payee Name': r.payee_name,
      'Amount (₹)': r.amount,
      'Status': r.advance ? 'Advance' : 'Final',
      'TDS': r.tds_deducted ? 'TDS ✓' : '—',
      'Mode': r.mode,
      'Date': r.payment_date,
      'Cheque / UTR': r.cheque_no || r.utr_no || '—',
      'Remarks': r.remarks || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Commission OUT')
    XLSX.writeFile(wb, `CommissionOut_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || filtered
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Commission OUT Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today} | Total records: ${list.length}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['File No.', 'Payee Type', 'Payee Name', 'Amount (₹)', 'Status', 'TDS', 'Mode', 'Date', 'Cheque / UTR'],
      ],
      body: list.map((r) => [
        r.file_number,
        r.payee_type,
        r.payee_name,
        '₹' + Number(r.amount).toLocaleString('en-IN'),
        r.advance ? 'Advance' : 'Final',
        r.tds_deducted ? 'Yes' : 'No',
        r.mode,
        r.payment_date,
        r.cheque_no || r.utr_no || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [185, 28, 28] },
      alternateRowStyles: { fillColor: [254, 242, 242] },
    })

    doc.save(`CommissionOut_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const hasFilters = search || filterType || filterMode || filterDateFrom || filterDateTo

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader title="Commission OUT" subtitle="Commission payouts to dealers, brokers & agents linked to files" />

      {/* KPI Bar */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red"><TrendingDown size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Commission Paid</div>
            <div className="pay-kpi-value" style={{ color: '#b91c1c' }}>{fmtINR(kpiTotal)}</div>
            <div className="pay-kpi-sub">{rows.length} transactions all-time</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon amber"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Advance Payouts</div>
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

      {/* Filter Bar */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="comm-out-search"
            className="pay-filter-input"
            placeholder="File no., payee name, remarks…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => { setExportMode('excel'); setExportModalOpen(true); }}>
          <FileSpreadsheet size={14} /> Export Excel
        </button>
        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => { setExportMode('pdf'); setExportModalOpen(true); }}>
          <FileDown size={14} /> Export PDF
        </button>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Payee Type</span>
          <select
            id="comm-out-type-filter"
            className="pay-filter-input"
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          >
            <option value="">All types</option>
            {PAYEE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Mode</span>
          <select
            id="comm-out-mode-filter"
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
            id="comm-out-date-from"
            type="date" className="pay-filter-input"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
          />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input
            id="comm-out-date-to"
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
          id="comm-out-add-btn"
          className="btn btn-primary btn-sm"
          style={{ alignSelf: 'flex-end' }}
          onClick={() => setShowAdd(true)}
        >
          <Plus size={14} /> Add Commission OUT
        </button>
      </div>

      {/* Table */}
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
                    <th>Payee Type</th>
                    <th>Payee Name</th>
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
                      <td><span
                        className="db-file-id"
                        style={{ cursor: 'pointer' }}
                        title="Click to view file details"
                        onClick={() => setDrawerFileId(r.file_id || null)}
                      >{r.file_number}</span></td>
                      <td>{payeeBadge(r.payee_type)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.payee_name}</td>
                      <td className="amt-negative">{fmtINR(r.amount)}</td>
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
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}
                            onClick={() => setViewRow(r)} title="View"><Eye size={13} /></button>
                          <button className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }}
                            onClick={() => { openEdit(r); if (!availableFiles.length) loadFilesDropdown() }} title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }}
                            onClick={() => handleDelete(r.id)} title="Delete">
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
              total={filtered.length}
              page={safePage}
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
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Commission OUT</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd() }}>
              <div className="modal-body">
                <div className="modal-grid-2">

                  {/* ─ File & Payee ─ */}
                  <div className="modal-section-label">File &amp; Payee</div>

                  <div className="form-group">
                    <label className="form-label">File <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-out-file"
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
                    <label className="form-label">Payee Type <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-out-payee-type"
                      className={`form-input ${errors.payee_type ? 'error' : ''}`}
                      value={form.payee_type}
                      onChange={(e) => updateForm('payee_type', e.target.value)}
                    >
                      {PAYEE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {errors.payee_type && <span className="form-error">{errors.payee_type}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Payee Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <Select
                      showSearch
                      className={`form-input-antd ${errors.payee_name ? 'error' : ''}`}
                      style={{ width: '100%', height: 42 }}
                      placeholder="Search or type payee name…"
                      value={form.payee_name || undefined}
                      onChange={(val: string) => updateForm('payee_name', val)}
                      onSearch={(val: string) => updateForm('payee_name', val)}
                      filterOption={(input: string, option: any) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      status={errors.payee_name ? 'error' : undefined}
                      options={payeeOptions}
                    />
                    {errors.payee_name && <span className="form-error">{errors.payee_name}</span>}
                  </div>

                  {/* ─ Amount & Flags ─ */}
                  <div className="modal-section-label">Amount &amp; Flags</div>

                  <div className="form-group">
                    <label className="form-label">Commission Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="comm-out-amount"
                      type="number" min="0" step="0.01"
                      className={`form-input ${errors.amount ? 'error' : ''}`}
                      placeholder="e.g. 12000"
                      value={form.amount}
                      onChange={(e) => updateForm('amount', e.target.value)}
                    />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'flex-end' }}>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        id="comm-out-advance"
                        type="checkbox"
                        style={{ accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                        checked={form.advance}
                        onChange={(e) => updateForm('advance', e.target.checked)}
                      />
                      Paid as Advance
                      <span style={{ fontSize: '.73rem', color: 'var(--gray-400)', fontWeight: 400 }}>
                        (before disbursement)
                      </span>
                    </label>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        id="comm-out-tds"
                        type="checkbox"
                        style={{ accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                        checked={form.tds_deducted}
                        onChange={(e) => updateForm('tds_deducted', e.target.checked)}
                      />
                      TDS Deducted
                    </label>
                  </div>

                  {/* ─ Mode & Date ─ */}
                  <div className="modal-section-label">Payment Mode &amp; Date</div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="comm-out-mode"
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
                      id="comm-out-date"
                      type="date"
                      className={`form-input ${errors.payment_date ? 'error' : ''}`}
                      value={form.payment_date}
                      onChange={(e) => updateForm('payment_date', e.target.value)}
                    />
                    {errors.payment_date && <span className="form-error">{errors.payment_date}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Company Bank Account</label>
                    <select
                      id="comm-out-bank"
                      className="form-input"
                      value={form.company_bank_id}
                      onChange={(e) => updateForm('company_bank_id', e.target.value)}
                    >
                      <option value="">— Select account —</option>
                      {companyBanks.length === 0
                        ? <option disabled>No bank accounts — add in Settings first</option>
                        : companyBanks.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)
                      }
                    </select>
                  </div>

                  {/* ─ Cheque / DD Fields ─ */}
                  {isChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {form.mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="comm-out-cheque-no"
                          className={`form-input ${errors.cheque_no ? 'error' : ''}`}
                          placeholder="e.g. CHQ334455"
                          value={form.cheque_no}
                          onChange={(e) => updateForm('cheque_no', e.target.value)}
                        />
                        {errors.cheque_no && <span className="form-error">{errors.cheque_no}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque Date</label>
                        <input
                          id="comm-out-cheque-date"
                          type="date" className="form-input"
                          value={form.cheque_date}
                          onChange={(e) => updateForm('cheque_date', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          id="comm-out-cheque-bank"
                          className="form-input"
                          placeholder="e.g. Axis Bank"
                          value={form.cheque_bank_name}
                          onChange={(e) => updateForm('cheque_bank_name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          id="comm-out-branch"
                          className="form-input"
                          placeholder="e.g. FC Road"
                          value={form.branch_name}
                          onChange={(e) => updateForm('branch_name', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* ─ NEFT / RTGS ─ */}
                  {isTransfer && (
                    <>
                      <div className="modal-section-label">Transfer Details</div>
                      <div className="form-group modal-full">
                        <label className="form-label">UTR / Reference No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="comm-out-utr"
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. RTG202510160021"
                          value={form.utr_no}
                          onChange={(e) => updateForm('utr_no', e.target.value)}
                        />
                        {errors.utr_no && <span className="form-error">{errors.utr_no}</span>}
                      </div>
                    </>
                  )}

                  {/* ─ Remarks ─ */}
                  <div className="modal-section-label">Additional Notes</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Remarks</label>
                    <textarea
                      id="comm-out-remarks"
                      className="form-input"
                      rows={2}
                      placeholder="Optional notes about this commission payout…"
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
                <button type="submit" id="comm-out-save-btn" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Save Commission OUT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Commission OUT — {viewRow.id}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File No.</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payee Type</div>
                  <div className="pay-detail-val">{payeeBadge(viewRow.payee_type)}</div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Payee Name</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>{viewRow.payee_name}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Commission Amount</div>
                  <div className="pay-detail-val amt-negative">{fmtINR(viewRow.amount)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Status</div>
                  <div className="pay-detail-val">{advancePill(viewRow.advance)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">TDS Deducted</div>
                  <div className="pay-detail-val">
                    {viewRow.tds_deducted
                      ? <span className="mode-badge mode-neft">Yes</span>
                      : <span style={{ color: 'var(--gray-400)' }}>No</span>}
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
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Company Bank</div>
                  <div className="pay-detail-val">
                    {companyBanks.find((b) => b.id === viewRow.company_bank_id)?.label ?? viewRow.company_bank_label ?? '—'}
                  </div>
                </div>
                {viewRow.cheque_no && <>
                  <div className="pay-detail-item">
                    <div className="pay-detail-key">Cheque / DD No.</div>
                    <div className="pay-detail-val" style={{ fontFamily: 'monospace' }}>{viewRow.cheque_no}</div>
                  </div>
                  <div className="pay-detail-item">
                    <div className="pay-detail-key">Cheque Date</div>
                    <div className="pay-detail-val">{viewRow.cheque_date ?? '—'}</div>
                  </div>
                  <div className="pay-detail-item">
                    <div className="pay-detail-key">Bank</div>
                    <div className="pay-detail-val">{viewRow.cheque_bank_name ?? '—'}</div>
                  </div>
                  <div className="pay-detail-item">
                    <div className="pay-detail-key">Branch</div>
                    <div className="pay-detail-val">{viewRow.branch_name ?? '—'}</div>
                  </div>
                </>}
                {viewRow.utr_no && (
                  <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="pay-detail-key">UTR / Reference No.</div>
                    <div className="pay-detail-val" style={{ fontFamily: 'monospace' }}>{viewRow.utr_no}</div>
                  </div>
                )}
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Remarks</div>
                  <div className="pay-detail-val">{viewRow.remarks || '—'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => { setViewRow(null); openEdit(viewRow); if (!availableFiles.length) loadFilesDropdown(); }}>Edit</button>
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editRow && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Commission OUT</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="form-group">
                  <label className="form-label">Payee Type</label>
                  <select className="form-input" value={editForm.payee_type}
                    onChange={(e) => setEditForm(p => ({ ...p, payee_type: e.target.value }))}>
                    {PAYEE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payee Name</label>
                  <input className="form-input" value={editForm.payee_name}
                    onChange={(e) => setEditForm(p => ({ ...p, payee_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-input" value={editForm.amount}
                    onChange={(e) => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mode</label>
                  <select className="form-input" value={editForm.mode}
                    onChange={(e) => setEditForm(p => ({ ...p, mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Date</label>
                  <input type="date" className="form-input" value={editForm.payment_date}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Company Bank</label>
                  <select className="form-input" value={editForm.company_bank_id}
                    onChange={(e) => setEditForm(p => ({ ...p, company_bank_id: e.target.value }))}>
                    <option value="">— None —</option>
                    {companyBanks.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cheque No.</label>
                  <input className="form-input" value={editForm.cheque_no}
                    onChange={(e) => setEditForm(p => ({ ...p, cheque_no: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">UTR No.</label>
                  <input className="form-input" value={editForm.utr_no}
                    onChange={(e) => setEditForm(p => ({ ...p, utr_no: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 16, gridColumn: '1/-1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm.advance}
                      onChange={(e) => setEditForm(p => ({ ...p, advance: e.target.checked }))} />
                    Advance
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={editForm.tds_deducted}
                      onChange={(e) => setEditForm(p => ({ ...p, tds_deducted: e.target.checked }))} />
                    TDS Deducted
                  </label>
                </div>
                <div className="form-group modal-full">
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={2} value={editForm.remarks}
                    onChange={(e) => setEditForm(p => ({ ...p, remarks: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setEditRow(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select Outward Commissions to Export"
        rows={filtered}
        getRecordName={(r) => `${r.payee_name} (${r.payee_type}) — File: ${r.file_number}`}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `commission_out_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'File Number', value: r.file_number },
              { label: 'Payee Type', value: r.payee_type },
              { label: 'Payee Name', value: r.payee_name },
              { label: 'Commission Amount', value: fmtINR(r.amount) },
              { label: 'Payment Status', value: r.advance ? 'Advance Payment' : 'Final Payment' },
              { label: 'TDS Deducted', value: r.tds_deducted ? 'Yes' : 'No' },
              { label: 'Payment Mode', value: r.mode },
              { label: 'Payment Date', value: r.payment_date },
              { label: 'Company Bank Account', value: companyBanks.find(b => b.id === r.company_bank_id)?.label ?? r.company_bank_label ?? '—' },
              { label: 'Cheque/Ref Number', value: r.cheque_no || r.utr_no || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `commission_out_${r.file_number || 'file'}_${r.payee_name || ''}`,
            'Commission OUT Voucher',
            'Voucher'
          );
        }}
      />
      {drawerFileId && <FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />}
    </>
  )
}
