import { useEffect, useState } from 'react'
import {
  TrendingUp, IndianRupee, Clock, Plus, X, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  FileSpreadsheet, FileDown, CheckCircle2,
} from 'lucide-react'
import { message } from 'antd'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageHeader from '../../components/app/PageHeader'
import { paymentsInApi, filesApi, bankAccountsApi } from '../../api/services'
import { addNotification } from '../../store/notificationStore'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'

const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const PAYMENT_FROM  = ['Customer', 'Bank', 'Insurer', 'Other'] as const

function fmtINR(n: number) {
  return '₹' + Number(n).toLocaleString('en-IN')
}

function modeBadge(mode: string) {
  const cls: Record<string, string> = {
    UPI: 'mode-upi', NEFT: 'mode-neft', RTGS: 'mode-rtgs',
    Cheque: 'mode-cheque', Cash: 'mode-cash', DD: 'mode-dd',
  }
  return <span className={`mode-badge ${cls[mode] ?? 'mode-other'}`}>{mode}</span>
}

function fromBadge(from: string) {
  const cls: Record<string, string> = {
    Customer: 'from-customer', Bank: 'from-bank',
    Insurer: 'from-insurer', Other: 'from-other',
  }
  return <span className={`from-badge ${cls[from] ?? 'from-other'}`}>{from}</span>
}

const EMPTY_FORM = {
  file_number: '',
  payment_amount: '',
  paid_amount: '',
  remaining_amount: '',
  round_up: false,
  payment_mode: 'UPI' as string,
  payment_date: new Date().toISOString().slice(0, 10),
  payment_from: 'Customer' as string,
  company_bank_id: '',
  cheque_bank_name: '',
  branch_name: '',
  cheque_no: '',
  cheque_date: '',
  utr_no: '',
  remarks: '',
}

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
          Showing {total === 0 ? 0 : start}–{end} of {total} records
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

export default function PaymentInPage() {
  const role = localStorage.getItem('user_role') || 'admin';
  const isAdmin = role === 'admin';

  const [rows, setRows]           = useState<any[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [availableFiles, setAvailableFiles] = useState<any[]>([])
  const [companyBanks, setCompanyBanks] = useState<{ id: string; label: string }[]>([])
  const [showAdd, setShowAdd]     = useState(false)
  const [viewRow, setViewRow]     = useState<any | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportRows, setExportRows] = useState<any[]>([]);

  const handleOpenExport = async (mode: 'pdf' | 'excel') => {
    setExportMode(mode);
    setExportLoading(true);
    try {
      const res = await paymentsInApi.list({
        page: 1,
        limit: 10000,
        search: search || undefined,
        payment_mode: filterMode || undefined,
        payment_from: filterFrom || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
      });
      if (res && Array.isArray(res.data)) {
        setExportRows(res.data);
        setExportModalOpen(true);
      } else {
        message.error("Failed to load export records");
      }
    } catch (err) {
      message.error("Failed to load export records");
    } finally {
      setExportLoading(false);
    }
  };
  const [editRow, setEditRow]     = useState<any | null>(null)
  const [editForm, setEditForm]   = useState({ ...EMPTY_FORM })
  const [form, setForm]           = useState({ ...EMPTY_FORM })
  const [errors, setErrors]       = useState<Record<string, string>>({})

  // Filters
  const [search, setSearch]       = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')

  // Pagination
  const [page, setPage]           = useState(1)
  const [pageSize, setPageSize]   = useState(5)

  // Fetch Payments from DB
  const loadPayments = async () => {
    try {
      const response = await paymentsInApi.list({
        page, 
        limit: pageSize, 
        search: search || undefined, 
        payment_mode: filterMode || undefined, 
        payment_from: filterFrom || undefined,
        date_from: filterDateFrom || undefined, 
        date_to: filterDateTo || undefined
      })
      setRows(response.data)
      setTotalRows(response.total)
    } catch (err) {
      message.error("Failed to load payments")
    }
  }

  // Fetch Files for dropdown
  const loadFilesDropdown = async () => {
    try {
      const response = await filesApi.list(1, 1000)
      setAvailableFiles(response.data)
    } catch (err) { }
  }

  useEffect(() => {
    loadPayments()
  }, [page, pageSize, search, filterMode, filterFrom, filterDateFrom, filterDateTo])

  useEffect(() => {
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

  // KPIs
  const kpiBilled    = rows.reduce((s, r) => s + Number(r.payment_amount), 0)
  const kpiReceived  = rows.reduce((s, r) => s + Number(r.paid_amount), 0)
  const kpiRemaining = rows.reduce((s, r) => s + Number(r.remaining_amount), 0)

  const isChequeLike = form.payment_mode === 'Cheque' || form.payment_mode === 'DD'
  const isTransfer   = form.payment_mode === 'NEFT' || form.payment_mode === 'RTGS'

  function updateForm(field: string, value: unknown) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'payment_amount' || field === 'paid_amount') {
        const total = parseFloat(String(field === 'payment_amount' ? value : next.payment_amount)) || 0
        const paid  = parseFloat(String(field === 'paid_amount'    ? value : next.paid_amount))    || 0
        next.remaining_amount = String(Math.max(0, total - paid))
      }
      return next
    })
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.file_number)    e.file_number    = 'File is required'
    if (!form.payment_amount || Number(form.payment_amount) <= 0) e.payment_amount = 'Enter a valid amount'
    if (!form.paid_amount && form.paid_amount !== '0') e.paid_amount = 'Enter paid amount (0 if not yet)'
    if (!form.payment_mode)   e.payment_mode   = 'Select payment mode'
    if (!form.payment_date)   e.payment_date   = 'Select date'
    if (!form.payment_from)   e.payment_from   = 'Select payment source'
    if (isChequeLike && !form.cheque_no) e.cheque_no = 'Cheque / DD number required'
    if (isTransfer   && !form.utr_no)   e.utr_no    = 'UTR / reference number required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd() {
    if (!validate()) return
    
    const payload = {
      file_id: form.file_number,
      payment_amount: Number(form.payment_amount),
      paid_amount: Number(form.paid_amount),
      remaining_amount: Number(form.remaining_amount),
      round_up: form.round_up,
      payment_mode: form.payment_mode,
      payment_date: form.payment_date,
      payment_from: form.payment_from,
      cheque_bank_name: form.cheque_bank_name || null,
      branch_name: form.branch_name || null,
      cheque_no: form.cheque_no || null,
      cheque_date: form.cheque_date || null,
      utr_no: form.utr_no || null,
      company_bank_id: form.company_bank_id || null,
      remarks: form.remarks || null,
    }

    try {
      await paymentsInApi.create(payload)
      message.success("Payment recorded successfully")
      addNotification('payment_recorded', `Payment of ₹${Number(form.payment_amount).toLocaleString('en-IN')} added (${form.payment_mode})`, 'Payment IN')
      setShowAdd(false)
      setForm({ ...EMPTY_FORM })
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || "Failed to save payment")
      addNotification('general', 'Failed to record payment. Please try again.', 'Payment IN')
    }
  }

  function openEdit(r: any) {
    setEditRow(r)
    setEditForm({
      file_number: r.file_id || '',
      payment_amount: String(r.payment_amount || ''),
      paid_amount: String(r.paid_amount || ''),
      remaining_amount: String(r.remaining_amount || ''),
      round_up: r.round_up || false,
      payment_mode: r.payment_mode ? r.payment_mode.charAt(0).toUpperCase() + r.payment_mode.slice(1) : 'UPI',
      payment_date: r.payment_date || new Date().toISOString().slice(0, 10),
      payment_from: r.payment_from ? r.payment_from.charAt(0).toUpperCase() + r.payment_from.slice(1) : 'Customer',
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
    const payload: any = {}
    if (editForm.payment_amount) payload.payment_amount = Number(editForm.payment_amount)
    if (editForm.paid_amount) payload.paid_amount = Number(editForm.paid_amount)
    if (editForm.remaining_amount !== '') payload.remaining_amount = Number(editForm.remaining_amount)
    payload.round_up = editForm.round_up
    payload.payment_mode = editForm.payment_mode
    payload.payment_date = editForm.payment_date
    payload.payment_from = editForm.payment_from
    payload.cheque_bank_name = editForm.cheque_bank_name || null
    payload.branch_name = editForm.branch_name || null
    payload.cheque_no = editForm.cheque_no || null
    payload.cheque_date = editForm.cheque_date || null
    payload.utr_no = editForm.utr_no || null
    payload.company_bank_id = editForm.company_bank_id || null
    payload.remarks = editForm.remarks || null
    try {
      await paymentsInApi.update(editRow.id, payload)
      message.success('Payment updated')
      setEditRow(null)
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update payment')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this payment record? This action cannot be undone.')) return
    try {
      await paymentsInApi.remove(id)
      message.success('Payment deleted')
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete payment')
    }
  }

  function resetFilters() {
    setSearch(''); setFilterMode(''); setFilterFrom('')
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1)
  }

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || rows
    const data = list.map((r) => ({
      'File No.': r.file_number,
      'Customer': r.customer,
      'Total Amt (₹)': r.payment_amount,
      'Paid (₹)': r.paid_amount,
      'Remaining (₹)': r.remaining_amount,
      'Mode': r.payment_mode,
      'From': r.payment_from,
      'Date': r.payment_date,
      'Cheque / UTR': r.cheque_no || r.utr_no || '—',
      'Remarks': r.remarks || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payment IN')
    XLSX.writeFile(wb, `PaymentIn_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || rows
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Payment IN Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today} | Total records: ${list.length}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['File No.', 'Customer', 'Total Amt (₹)', 'Paid (₹)', 'Remaining (₹)', 'Mode', 'From', 'Date', 'Cheque / UTR'],
      ],
      body: list.map((r) => [
        r.file_number,
        r.customer,
        '₹' + Number(r.payment_amount).toLocaleString('en-IN'),
        '₹' + Number(r.paid_amount).toLocaleString('en-IN'),
        r.remaining_amount > 0 ? '₹' + Number(r.remaining_amount).toLocaleString('en-IN') : 'Cleared',
        r.payment_mode,
        r.payment_from,
        r.payment_date,
        r.cheque_no || r.utr_no || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`PaymentIn_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const hasFilters = search || filterMode || filterFrom || filterDateFrom || filterDateTo

  return (
    <>
      <PageHeader title="Payment IN" subtitle="Inward payment ledger — all receipts linked to files" />

      {/* KPI bar */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Billed (Current Page)</div>
            <div className="pay-kpi-value">{fmtINR(kpiBilled)}</div>
            <div className="pay-kpi-sub">{rows.length} transactions</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><TrendingUp size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Received</div>
            <div className="pay-kpi-value" style={{ color: '#15803d' }}>{fmtINR(kpiReceived)}</div>
            <div className="pay-kpi-sub">{Math.round((kpiReceived / (kpiBilled || 1)) * 100)}% of billed</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red"><Clock size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Remaining</div>
            <div className="pay-kpi-value" style={{ color: kpiRemaining > 0 ? '#b91c1c' : '#15803d' }}>
              {fmtINR(kpiRemaining)}
            </div>
            <div className="pay-kpi-sub">{kpiRemaining > 0 ? 'Outstanding dues' : 'Fully collected ✓'}</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="pay-in-search"
            className="pay-filter-input"
            placeholder="File no., customer, remarks…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => handleOpenExport('excel')} disabled={exportLoading}>
          <FileSpreadsheet size={14} /> {exportLoading && exportMode === 'excel' ? 'Loading...' : 'Export Excel'}
        </button>
        <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => handleOpenExport('pdf')} disabled={exportLoading}>
          <FileDown size={14} /> {exportLoading && exportMode === 'pdf' ? 'Loading...' : 'Export PDF'}
        </button>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Mode</span>
          <select
            id="pay-in-mode-filter"
            className="pay-filter-input"
            value={filterMode}
            onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}
          >
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Payment From</span>
          <select
            id="pay-in-from-filter"
            className="pay-filter-input"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(1) }}
          >
            <option value="">All sources</option>
            {PAYMENT_FROM.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date From</span>
          <input
            id="pay-in-date-from"
            type="date" className="pay-filter-input"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
          />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input
            id="pay-in-date-to"
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
        {isAdmin && (
          <button
            id="pay-in-add-btn"
            className="btn btn-primary btn-sm"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} /> Add Payment IN
          </button>
        )}
      </div>

      {/* Table */}
      <div className="data-card">
        {rows.length === 0 ? (
          <div className="data-empty">No payment records match your filters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>File No.</th>
                    <th>Customer</th>
                    <th>Total Amt (₹)</th>
                    <th>Paid (₹)</th>
                    <th>Remaining (₹)</th>
                    <th>Mode</th>
                    <th>From</th>
                    <th>Date</th>
                    <th>Cheque / UTR</th>
                    <th>Remarks</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: '.8rem' }}>
                        {(page - 1) * pageSize + i + 1}
                      </td>
                      <td>
                        <span className="db-file-id">{r.file_number}</span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.customer}</td>
                      <td className="amt-neutral">{fmtINR(r.payment_amount)}</td>
                      <td className="amt-positive">{fmtINR(r.paid_amount)}</td>
                      <td>
                        {r.remaining_amount > 0
                          ? <span className="amt-pending">{fmtINR(r.remaining_amount)}</span>
                          : <span className="amt-positive" style={{ fontSize: '.78rem' }}>Cleared</span>
                        }
                      </td>
                      <td>{modeBadge(r.payment_mode)}</td>
                      <td>{fromBadge(r.payment_from)}</td>
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
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
                          background: r.status === 'pending' ? '#fef3c7' : '#dcfce7',
                          color: r.status === 'pending' ? '#92400e' : '#166534',
                        }}>
                          <CheckCircle2 size={11} />
                          {r.status === 'pending' ? 'Pending' : 'Completed'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ padding: '5px 10px' }}
                            onClick={() => setViewRow(r)}
                            title="View details"
                          >
                            <Eye size={13} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }}
                                onClick={() => { openEdit(r); if (!availableFiles.length) loadFilesDropdown() }}
                                title="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{
                                  padding: '5px 10px',
                                  borderColor: r.status === 'pending' ? '#86efac' : '#fcd34d',
                                  color: r.status === 'pending' ? '#16a34a' : '#b45309',
                                }}
                                onClick={async () => {
                                  try {
                                    await paymentsInApi.toggleStatus(r.id)
                                    message.success(`Payment marked as ${r.status === 'pending' ? 'completed' : 'pending'}`)
                                    loadPayments()
                                  } catch { message.error('Failed to update status') }
                                }}
                                title={r.status === 'pending' ? 'Mark as Completed' : 'Mark as Pending'}
                              >
                                <CheckCircle2 size={13} />
                              </button>
                              <button
                                className="btn btn-outline btn-sm"
                                style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }}
                                onClick={() => handleDelete(r.id)}
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
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
          <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Payment IN</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd() }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  {/* ─ File & Customer ─ */}
                  <div className="modal-section-label">File & Payment Info</div>

                  <div className="form-group">
                    <label className="form-label">File <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-in-file"
                      className={`form-input ${errors.file_number ? 'error' : ''}`}
                      value={form.file_number}
                      onChange={(e) => updateForm('file_number', e.target.value)}
                    >
                      <option value="">Select active file…</option>
                      {availableFiles.map((f) => (
                        <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                      ))}
                    </select>
                    {errors.file_number && <span className="form-error">{errors.file_number}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment From <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-in-from"
                      className={`form-input ${errors.payment_from ? 'error' : ''}`}
                      value={form.payment_from}
                      onChange={(e) => updateForm('payment_from', e.target.value)}
                    >
                      {PAYMENT_FROM.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    {errors.payment_from && <span className="form-error">{errors.payment_from}</span>}
                  </div>

                  {/* ─ Amounts ─ */}
                  <div className="modal-section-label">Amount Details</div>

                  <div className="form-group">
                    <label className="form-label">Total Payment Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="pay-in-total-amt"
                      type="number" min="0" step="0.01"
                      className={`form-input ${errors.payment_amount ? 'error' : ''}`}
                      placeholder="e.g. 50000"
                      value={form.payment_amount}
                      onChange={(e) => updateForm('payment_amount', e.target.value)}
                    />
                    {errors.payment_amount && <span className="form-error">{errors.payment_amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Paid Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="pay-in-paid-amt"
                      type="number" min="0" step="0.01"
                      className={`form-input ${errors.paid_amount ? 'error' : ''}`}
                      placeholder="Amount actually received"
                      value={form.paid_amount}
                      onChange={(e) => updateForm('paid_amount', e.target.value)}
                    />
                    {errors.paid_amount && <span className="form-error">{errors.paid_amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Remaining Amount (₹)</label>
                    <input
                      id="pay-in-remaining-amt"
                      type="number" readOnly
                      className="form-input"
                      style={{ background: 'var(--surface-1)', color: form.remaining_amount && Number(form.remaining_amount) > 0 ? '#b91c1c' : '#15803d' }}
                      value={form.remaining_amount}
                    />
                    <span style={{ fontSize: '.75rem', color: 'var(--gray-400)' }}>Auto-calculated</span>
                  </div>

                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label className="form-label" style={{ userSelect: 'none', cursor: 'pointer' }}>
                      <input
                        id="pay-in-round-up"
                        type="checkbox"
                        style={{ marginRight: 8, accentColor: 'var(--brand-600)', width: 15, height: 15 }}
                        checked={form.round_up}
                        onChange={(e) => updateForm('round_up', e.target.checked)}
                      />
                      Round Up Amount
                    </label>
                  </div>

                  {/* ─ Mode & Date ─ */}
                  <div className="modal-section-label">Payment Mode &amp; Date</div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-in-mode"
                      className={`form-input ${errors.payment_mode ? 'error' : ''}`}
                      value={form.payment_mode}
                      onChange={(e) => updateForm('payment_mode', e.target.value)}
                    >
                      {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                    {errors.payment_mode && <span className="form-error">{errors.payment_mode}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Date <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="pay-in-date"
                      type="date"
                      className={`form-input ${errors.payment_date ? 'error' : ''}`}
                      value={form.payment_date}
                      onChange={(e) => updateForm('payment_date', e.target.value)}
                    />
                    {errors.payment_date && <span className="form-error">{errors.payment_date}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Company Bank Account</label>
                    <select
                      id="pay-in-company-bank"
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

                  {/* ─ Cheque / DD fields ─ */}
                  {isChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {form.payment_mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="pay-in-cheque-no"
                          className={`form-input ${errors.cheque_no ? 'error' : ''}`}
                          placeholder="e.g. CHQ001234"
                          value={form.cheque_no}
                          onChange={(e) => updateForm('cheque_no', e.target.value)}
                        />
                        {errors.cheque_no && <span className="form-error">{errors.cheque_no}</span>}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque Date</label>
                        <input
                          id="pay-in-cheque-date"
                          type="date" className="form-input"
                          value={form.cheque_date}
                          onChange={(e) => updateForm('cheque_date', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          id="pay-in-cheque-bank"
                          className="form-input"
                          placeholder="e.g. SBI"
                          value={form.cheque_bank_name}
                          onChange={(e) => updateForm('cheque_bank_name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          id="pay-in-branch"
                          className="form-input"
                          placeholder="e.g. Shivaji Nagar"
                          value={form.branch_name}
                          onChange={(e) => updateForm('branch_name', e.target.value)}
                        />
                      </div>
                    </>
                  )}

                  {/* ─ NEFT / RTGS fields ─ */}
                  {isTransfer && (
                    <>
                      <div className="modal-section-label">Transfer Details</div>
                      <div className="form-group modal-full">
                        <label className="form-label">UTR / Reference No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="pay-in-utr"
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. NFT202510220089"
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
                      id="pay-in-remarks"
                      className="form-input"
                      rows={2}
                      placeholder="Optional notes about this payment…"
                      value={form.remarks}
                      onChange={(e) => updateForm('remarks', e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => { setShowAdd(false); setErrors({}) }}>
                  Cancel
                </button>
                <button type="submit" id="pay-in-save-btn" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Save Payment IN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View/Detail Modal ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment IN</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File No.</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Customer</div>
                  <div className="pay-detail-val">{viewRow.customer}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Total Payment Amount</div>
                  <div className="pay-detail-val amt-neutral">{fmtINR(viewRow.payment_amount)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Paid Amount</div>
                  <div className="pay-detail-val amt-positive">{fmtINR(viewRow.paid_amount)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Remaining Amount</div>
                  <div className={`pay-detail-val ${viewRow.remaining_amount > 0 ? 'amt-pending' : 'amt-positive'}`}>
                    {viewRow.remaining_amount > 0 ? fmtINR(viewRow.remaining_amount) : 'Cleared ✓'}
                  </div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Round Up</div>
                  <div className="pay-detail-val">{viewRow.round_up ? 'Yes' : 'No'}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Mode</div>
                  <div className="pay-detail-val">{modeBadge(viewRow.payment_mode)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Date</div>
                  <div className="pay-detail-val">{viewRow.payment_date}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment From</div>
                  <div className="pay-detail-val">{fromBadge(viewRow.payment_from)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Company Bank</div>
                  <div className="pay-detail-val">{companyBanks.find(b => b.id === viewRow.company_bank_id)?.label ?? viewRow.company_bank_label ?? '—'}</div>
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
              {isAdmin && <button className="btn btn-outline btn-sm" onClick={() => { setViewRow(null); openEdit(viewRow); if (!availableFiles.length) loadFilesDropdown(); }}>Edit</button>}
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal (Rendered securely only for admin when available) ── */}
      {editRow && isAdmin && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Payment IN</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="form-group">
                  <label className="form-label">Total Amount (₹)</label>
                  <input type="number" className="form-input" value={editForm.payment_amount}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Paid Amount (₹)</label>
                  <input type="number" className="form-input" value={editForm.paid_amount}
                    onChange={(e) => setEditForm(p => ({ ...p, paid_amount: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select className="form-input" value={editForm.payment_mode}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_mode: e.target.value }))}>
                    {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment From</label>
                  <select className="form-input" value={editForm.payment_from}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_from: e.target.value }))}>
                    {PAYMENT_FROM.map(f => <option key={f}>{f}</option>)}
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
        title="Select Inward Payments to Export"
        rows={exportRows}
        getRecordName={(r) => `${r.customer} — File: ${r.file_number}`}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `payment_in_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'File Number', value: r.file_number },
              { label: 'Customer', value: r.customer },
              { label: 'Total Amount', value: fmtINR(r.payment_amount) },
              { label: 'Paid Amount', value: fmtINR(r.paid_amount) },
              { label: 'Remaining Amount', value: r.remaining_amount > 0 ? fmtINR(r.remaining_amount) : 'Cleared' },
              { label: 'Payment Mode', value: r.payment_mode },
              { label: 'Payment From', value: r.payment_from },
              { label: 'Payment Date', value: r.payment_date },
              { label: 'Company Bank', value: companyBanks.find(b => b.id === r.company_bank_id)?.label ?? r.company_bank_label ?? '—' },
              { label: 'Cheque Number', value: r.cheque_no || '—' },
              { label: 'Cheque Date', value: r.cheque_date || '—' },
              { label: 'Cheque Bank Name', value: r.cheque_bank_name || '—' },
              { label: 'Branch Name', value: r.branch_name || '—' },
              { label: 'UTR Number', value: r.utr_no || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `payment_in_${r.file_number || 'file'}_${r.customer || ''}`,
            'Payment IN Receipt',
            'Receipt'
          );
        }}
      />
    </>
  )
}