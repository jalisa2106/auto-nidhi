import { useEffect, useMemo, useState } from 'react'
import {
  TrendingDown, IndianRupee, Hash, Plus, X, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw,
  FileSpreadsheet, FileDown, CheckCircle2,
} from 'lucide-react'
import { message, Select } from 'antd'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import PageHeader from '../../components/app/PageHeader'
import { paymentsOutApi, filesApi, bankAccountsApi, usersSettingsApi, customersApi, brokersApi, dealersApi } from '../../api/services'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'


const PAYMENT_MODES  = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const PAYMENT_TO_TYPES = ['Customer', 'Dealer', 'Broker', 'Other'] as const

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

function toBadge(to: string) {
  const cls: Record<string, string> = {
    Customer: 'from-customer', Dealer: 'from-dealer',
    Broker: 'from-broker', Other: 'from-other',
  }
  return <span className={`from-badge ${cls[to] ?? 'from-other'}`}>{to}</span>
}

function thisMonthRange() {
  const now = new Date()
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const to   = now.toISOString().slice(0, 10)
  return { from, to }
}

const EMPTY_FORM = {
  file_number:      '',
  payment_to:       'Dealer' as string,
  payee_name:       '',
  amount:           '',
  payment_mode:     'UPI' as string,
  payment_date:     new Date().toISOString().slice(0, 10),
  company_bank_id:  '',
  cheque_bank_name: '',
  branch_name:      '',
  cheque_no:        '',
  cheque_date:      '',
  utr_no:           '',
  remarks:          '',
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

export default function PaymentOutPage() {
  const role = localStorage.getItem('user_role') || 'admin';
  const isAdmin = role === 'admin';

  const [rows, setRows]           = useState<any[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [availableFiles, setAvailableFiles] = useState<any[]>([])
  const [companyBanks, setCompanyBanks] = useState<{ id: string; label: string }[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [brokers, setBrokers] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  
  const [showAdd, setShowAdd]   = useState(false)
  const [viewRow, setViewRow]   = useState<any | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportRows, setExportRows] = useState<any[]>([]);

  const handleOpenExport = async (mode: 'pdf' | 'excel') => {
    setExportMode(mode);
    setExportLoading(true);
    try {
      const res = await paymentsOutApi.list({
        page: 1,
        limit: 10000,
        search: search || undefined,
        payment_mode: filterMode || undefined,
        payment_to: filterTo || undefined,
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
  const [editRow, setEditRow]   = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [errors, setErrors]     = useState<Record<string, string>>({})

  // Filters
  const [search, setSearch]           = useState('')
  const [filterMode, setFilterMode]   = useState('')
  const [filterTo, setFilterTo]       = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo]     = useState('')

  // Pagination
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const payeeOptions = useMemo(() => {
    if (form.payment_to === 'Broker') return brokers
    if (form.payment_to === 'Dealer') return dealers
    if (form.payment_to === 'Customer') return customers
    return staff
  }, [form.payment_to, staff, brokers, dealers, customers])

  // Data Fetching
  const loadPayments = async () => {
    try {
      const response = await paymentsOutApi.list({
        page, 
        limit: pageSize, 
        search: search || undefined, 
        payment_mode: filterMode || undefined, 
        payment_to: filterTo || undefined,
        date_from: filterDateFrom || undefined, 
        date_to: filterDateTo || undefined
      })
      setRows(response.data)
      setTotalRows(response.total)
    } catch (err) {
      message.error("Failed to load payments")
    }
  }

  const loadFilesDropdown = async () => {
    try {
      const response = await filesApi.list(1, 1000)
      setAvailableFiles(response.data)
    } catch (err) { }
  }

  useEffect(() => {
    loadPayments()
  }, [page, pageSize, search, filterMode, filterTo, filterDateFrom, filterDateTo])

  useEffect(() => {
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

    // Load customers
    customersApi.list(1, 2000).then(res => {
      setCustomers((res.data || []).map((c: any) => ({
        label: c.full_name,
        value: c.full_name
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (showAdd) loadFilesDropdown()
  }, [showAdd])

  // KPIs
  const kpiTotal     = rows.reduce((s, r) => s + Number(r.amount), 0)
  const { from: mFrom, to: mTo } = thisMonthRange()
  const kpiThisMonth = rows
    .filter((r) => r.payment_date >= mFrom && r.payment_date <= mTo)
    .reduce((s, r) => s + Number(r.amount), 0)
  const kpiCount     = totalRows

  const isChequeLike = form.payment_mode === 'Cheque' || form.payment_mode === 'DD'
  const isTransfer   = form.payment_mode === 'NEFT'   || form.payment_mode === 'RTGS'

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.file_number)                e.file_number  = 'File is required'
    if (!form.payment_to)                 e.payment_to   = 'Select payment type'
    if (!form.payee_name.trim())          e.payee_name   = 'Payee name is required'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Enter a valid amount'
    if (!form.payment_mode)               e.payment_mode = 'Select payment mode'
    if (!form.payment_date)               e.payment_date = 'Select date'
    if (isChequeLike && !form.cheque_no)  e.cheque_no    = 'Cheque / DD number required'
    if (isTransfer   && !form.utr_no)     e.utr_no       = 'UTR / reference number required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleAdd() {
    if (!validate()) return
    
    const payload = {
      file_id:          form.file_number,
      payment_to:       form.payment_to,
      payee_name:       form.payee_name.trim(),
      amount:           Number(form.amount),
      payment_mode:     form.payment_mode,
      payment_date:     form.payment_date,
      cheque_bank_name: form.cheque_bank_name || null,
      branch_name:      form.branch_name      || null,
      cheque_no:        form.cheque_no        || null,
      cheque_date:      form.cheque_date      || null,
      utr_no:           form.utr_no           || null,
      company_bank_id:  form.company_bank_id  || null,
      remarks:          form.remarks          || null,
    }

    try {
      await paymentsOutApi.create(payload)
      message.success("Payment OUT recorded successfully")
      setShowAdd(false)
      setForm({ ...EMPTY_FORM })
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || "Failed to save payment")
    }
  }

  function openEdit(r: any) {
    setEditRow(r)
    setEditForm({
      file_number: r.file_id || '',
      payment_to: r.payment_to || 'Dealer',
      payee_name: r.payee_name || '',
      amount: String(r.amount || ''),
      payment_mode: r.payment_mode || 'UPI',
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
      payment_to: editForm.payment_to,
      payee_name: editForm.payee_name,
      amount: Number(editForm.amount),
      payment_mode: editForm.payment_mode,
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
      await paymentsOutApi.update(editRow.id, payload)
      message.success('Payment updated')
      setEditRow(null)
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update payment')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this payment? This cannot be undone.')) return
    try {
      await paymentsOutApi.remove(id)
      message.success('Payment deleted')
      loadPayments()
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete payment')
    }
  }

  function resetFilters() {
    setSearch(''); setFilterMode(''); setFilterTo('')
    setFilterDateFrom(''); setFilterDateTo(''); setPage(1)
  }

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || rows
    const data = list.map((r) => ({
      'File No.': r.file_number,
      'Payment To': r.payment_to,
      'Payee Name': r.payee_name,
      'Amount (₹)': r.amount,
      'Mode': r.payment_mode,
      'Date': r.payment_date,
      'Cheque / UTR': r.cheque_no || r.utr_no || '—',
      'Remarks': r.remarks || '—',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 25 }
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Payment OUT')
    XLSX.writeFile(wb, `PaymentOut_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || rows
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Payment OUT Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today} | Total records: ${list.length}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['File No.', 'Payment To', 'Payee Name', 'Amount (₹)', 'Mode', 'Date', 'Cheque / UTR'],
      ],
      body: list.map((r) => [
        r.file_number,
        r.payment_to,
        r.payee_name,
        '₹' + Number(r.amount).toLocaleString('en-IN'),
        r.payment_mode,
        r.payment_date,
        r.cheque_no || r.utr_no || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [239, 68, 68] },
      alternateRowStyles: { fillColor: [255, 245, 245] },
    })

    doc.save(`PaymentOut_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const hasFilters = search || filterMode || filterTo || filterDateFrom || filterDateTo

  return (
    <>
      <PageHeader title="Payment OUT" subtitle="Outward payment ledger — all disbursements linked to files" />

      {/* KPI bar */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red"><TrendingDown size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Paid Out (Current Page)</div>
            <div className="pay-kpi-value" style={{ color: '#b91c1c' }}>{fmtINR(kpiTotal)}</div>
            <div className="pay-kpi-sub">All-time disbursements</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon amber"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">This Month (Current Page)</div>
            <div className="pay-kpi-value" style={{ color: '#b45309' }}>{fmtINR(kpiThisMonth)}</div>
            <div className="pay-kpi-sub">
              {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><Hash size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Transactions</div>
            <div className="pay-kpi-value">{kpiCount}</div>
            <div className="pay-kpi-sub">Total payment entries</div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input
            id="pay-out-search"
            className="pay-filter-input"
            placeholder="File no., payee name, remarks…"
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
            id="pay-out-mode-filter"
            className="pay-filter-input"
            value={filterMode}
            onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}
          >
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Payment To</span>
          <select
            id="pay-out-to-filter"
            className="pay-filter-input"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(1) }}
          >
            <option value="">All types</option>
            {PAYMENT_TO_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date From</span>
          <input
            id="pay-out-date-from"
            type="date" className="pay-filter-input"
            value={filterDateFrom}
            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
          />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input
            id="pay-out-date-to"
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
            id="pay-out-add-btn"
            className="btn btn-primary btn-sm"
            style={{ alignSelf: 'flex-end' }}
            onClick={() => setShowAdd(true)}
          >
            <Plus size={14} /> Add Payment OUT
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
                    <th>Payment To</th>
                    <th>Payee Name</th>
                    <th>Amount (₹)</th>
                    <th>Mode</th>
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
                      <td><span className="db-file-id">{r.file_number}</span></td>
                      <td>{toBadge(r.payment_to)}</td>
                      <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.payee_name}</td>
                      <td className="amt-negative">{fmtINR(r.amount)}</td>
                      <td>{modeBadge(r.payment_mode)}</td>
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
                          <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}
                            onClick={() => setViewRow(r)} title="View">
                            <Eye size={13} />
                          </button>
                          {isAdmin && (
                            <>
                              <button className="btn btn-outline btn-sm"
                                style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }}
                                onClick={() => { openEdit(r); if (!availableFiles.length) loadFilesDropdown() }} title="Edit">
                                <Pencil size={13} />
                              </button>
                              <button className="btn btn-outline btn-sm"
                                style={{
                                  padding: '5px 10px',
                                  borderColor: r.status === 'pending' ? '#86efac' : '#fcd34d',
                                  color: r.status === 'pending' ? '#16a34a' : '#b45309',
                                }}
                                onClick={async () => {
                                  try {
                                    await paymentsOutApi.toggleStatus(r.id)
                                    message.success(`Payment marked as ${r.status === 'pending' ? 'completed' : 'pending'}`)
                                    loadPayments()
                                  } catch { message.error('Failed to update status') }
                                }}
                                title={r.status === 'pending' ? 'Mark as Completed' : 'Mark as Pending'}>
                                <CheckCircle2 size={13} />
                              </button>
                              <button className="btn btn-outline btn-sm"
                                style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }}
                                onClick={() => handleDelete(r.id)} title="Delete">
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
              <h3>Add Payment OUT</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdd() }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  <div className="modal-section-label">File &amp; Payee Info</div>

                  <div className="form-group">
                    <label className="form-label">File <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-out-file"
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
                    <label className="form-label">Payment To (Type) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-out-to-type"
                      className={`form-input ${errors.payment_to ? 'error' : ''}`}
                      value={form.payment_to}
                      onChange={(e) => updateForm('payment_to', e.target.value)}
                    >
                      {PAYMENT_TO_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    {errors.payment_to && <span className="form-error">{errors.payment_to}</span>}
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Payee Name <span style={{ color: 'var(--error)' }}>*</span></label>
                    <Select
                      showSearch
                      className={`form-input-antd ${errors.payee_name ? 'error' : ''}`}
                      style={{ width: '100%', height: 42 }}
                      placeholder="Search or type payee name…"
                      value={form.payee_name || undefined}
                      onChange={(val) => updateForm('payee_name', val)}
                      onSearch={(val) => updateForm('payee_name', val)}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      status={errors.payee_name ? 'error' : undefined}
                      options={payeeOptions}
                    />
                    {errors.payee_name && <span className="form-error">{errors.payee_name}</span>}
                  </div>

                  <div className="modal-section-label">Amount &amp; Mode</div>

                  <div className="form-group">
                    <label className="form-label">Amount (₹) <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input
                      id="pay-out-amount"
                      type="number" min="0" step="0.01"
                      className={`form-input ${errors.amount ? 'error' : ''}`}
                      placeholder="e.g. 18000"
                      value={form.amount}
                      onChange={(e) => updateForm('amount', e.target.value)}
                    />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode <span style={{ color: 'var(--error)' }}>*</span></label>
                    <select
                      id="pay-out-mode"
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
                      id="pay-out-date"
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
                      id="pay-out-company-bank"
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

                  {isChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {form.payment_mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'var(--error)' }}>*</span></label>
                        <input
                          id="pay-out-cheque-no"
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
                          id="pay-out-cheque-date"
                          type="date" className="form-input"
                          value={form.cheque_date}
                          onChange={(e) => updateForm('cheque_date', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          id="pay-out-cheque-bank"
                          className="form-input"
                          placeholder="e.g. HDFC Bank"
                          value={form.cheque_bank_name}
                          onChange={(e) => updateForm('cheque_bank_name', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          id="pay-out-branch"
                          className="form-input"
                          placeholder="e.g. FC Road"
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
                          id="pay-out-utr"
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. RTG202510210055"
                          value={form.utr_no}
                          onChange={(e) => updateForm('utr_no', e.target.value)}
                        />
                        {errors.utr_no && <span className="form-error">{errors.utr_no}</span>}
                      </div>
                    </>
                  )}

                  <div className="modal-section-label">Additional Notes</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Remarks</label>
                    <textarea
                      id="pay-out-remarks"
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
                <button type="submit" id="pay-out-save-btn" className="btn btn-primary btn-sm">
                  <Plus size={14} /> Save Payment OUT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View / Detail Modal ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment OUT</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File No.</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment To</div>
                  <div className="pay-detail-val">{toBadge(viewRow.payment_to)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payee Name</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>{viewRow.payee_name}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Amount</div>
                  <div className="pay-detail-val amt-negative">{fmtINR(viewRow.amount)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Mode</div>
                  <div className="pay-detail-val">{modeBadge(viewRow.payment_mode)}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Date</div>
                  <div className="pay-detail-val">{viewRow.payment_date}</div>
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

      {/* ── Edit Modal ── */}
      {editRow && isAdmin && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Payment OUT</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="form-group">
                  <label className="form-label">Payment To (Type)</label>
                  <select className="form-input" value={editForm.payment_to}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_to: e.target.value }))}>
                    {PAYMENT_TO_TYPES.map(t => <option key={t}>{t}</option>)}
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
                  <label className="form-label">Payment Mode</label>
                  <select className="form-input" value={editForm.payment_mode}
                    onChange={(e) => setEditForm(p => ({ ...p, payment_mode: e.target.value }))}>
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
        title="Select Outward Payments to Export"
        rows={exportRows}
        getRecordName={(r) => `${r.payee_name} (${r.payment_to}) — File: ${r.file_number}`}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `payment_out_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'File Number', value: r.file_number },
              { label: 'Payment To', value: r.payment_to },
              { label: 'Payee Name', value: r.payee_name },
              { label: 'Amount Outward', value: fmtINR(r.amount) },
              { label: 'Payment Mode', value: r.payment_mode },
              { label: 'Payment Date', value: r.payment_date },
              { label: 'Company Bank', value: companyBanks.find(b => b.id === r.company_bank_id)?.label ?? r.company_bank_label ?? '—' },
              { label: 'Cheque Number', value: r.cheque_no || '—' },
              { label: 'Cheque Date', value: r.cheque_date || '—' },
              { label: 'Cheque Bank Name', value: r.cheque_bank_name || '—' },
              { label: 'Branch Name', value: r.branch_name || '—' },
              { label: 'UTR Number', value: r.utr_no || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `payment_out_${r.file_number || 'file'}_${r.payee_name || ''}`,
            'Payment OUT Voucher',
            'Voucher'
          );
        }}
      />
    </>
  )
}