import { useMemo, useState, useEffect } from 'react'
import {
  ShieldAlert,
  IndianRupee,
  CalendarClock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Download,
  FileText,
  Mail,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { insurancePaymentsApi, usersSettingsApi } from '../../api/services'
import api from '../../api/axios'
import PageHeader from '../../components/app/PageHeader'

// ── Interfaces ──────────────────────────────────────────────────────────────

interface InsurancePayment {
  id: string
  file_number: string
  payee_name: string
  amount: number
  mode: string
  payment_date: string
  valid_to: string
  remarks: string
  cheque_no: string
  utr_no: string
  is_deleted: boolean
}

type PolicyStatus = 'Active' | 'Expiring Soon' | 'Expired'

interface MailForm {
  subject: string
  message: string
  includeSummary: boolean
}

// ── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const
const PAGE_SIZES = [5, 10, 20, 50] as const

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPolicyStatus(validTo: string): PolicyStatus {
  if (!validTo) return 'Active'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(validTo)
  expiry.setHours(0, 0, 0, 0)
  if (expiry < today) return 'Expired'
  const sevenDaysOut = new Date(today)
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7)
  if (expiry <= sevenDaysOut) return 'Expiring Soon'
  return 'Active'
}

function statusBadgeStyle(status: PolicyStatus): React.CSSProperties {
  if (status === 'Active')
    return { background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }
  if (status === 'Expiring Soon')
    return { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
  return { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }
}

function fmtAmount(n: number) {
  return `₹${Number(n).toLocaleString('en-IN')}`
}

function fmtDate(d: string) {
  if (!d) return '—'
  return d
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InsurancePaymentsPage() {
  // ── Data state ────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<InsurancePayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | PolicyStatus>('')
  const [filterMode, setFilterMode] = useState('')
  const [filterAmtMin, setFilterAmtMin] = useState('')
  const [filterAmtMax, setFilterAmtMax] = useState('')

  // ── Pagination state ──────────────────────────────────────────────────────
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(5)

  // ── View-detail modal state ───────────────────────────────────────────────
  const [viewRow, setViewRow] = useState<InsurancePayment | null>(null)

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState<InsurancePayment | null>(null)
  const [editForm, setEditForm] = useState({
    payee_name: '', amount: '', mode: 'UPI', payment_date: '', valid_to: '', remarks: '',
    cheque_no: '', utr_no: '',
  })

  // ── Mail modal state ──────────────────────────────────────────────────────
  const [showMail, setShowMail] = useState(false)
  const [mailForm, setMailForm] = useState<MailForm>({
    subject: `Insurance Payments Summary — ${new Date().toLocaleDateString('en-IN')}`,
    message: '',
    includeSummary: true,
  })
  const [mailSending, setMailSending] = useState(false)

  // Load admins
  interface SimpleAdmin {
    id: string;
    first_name: string;
    last_name: string | null;
    email: string;
  }
  const [adminsList, setAdminsList] = useState<SimpleAdmin[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      setLoadingAdmins(true);
      try {
        const res = await usersSettingsApi.list(1, 200);
        const list = res.data || [];
        const activeAdmins = list.filter(
          (u: any) => u.is_active && (u.role_name || '').toLowerCase() === 'admin'
        ).map((u: any) => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          email: u.email,
        }));
        setAdminsList(activeAdmins);
        setSelectedAdminIds(activeAdmins.map((a: any) => a.id));
      } catch (err) {
        console.error('Failed to load admins', err);
      } finally {
        setLoadingAdmins(false);
      }
    };
    fetchAdmins();
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await insurancePaymentsApi.list()
        const data: InsurancePayment[] = (result?.data ?? result ?? []) as InsurancePayment[]
        setRows(data.filter((r) => !r.is_deleted))
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load insurance payments.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Derived stats (on all non-deleted rows) ───────────────────────────────
  const totalPremiums = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.amount), 0),
    [rows]
  )
  const activeCount = useMemo(
    () => rows.filter((r) => getPolicyStatus(r.valid_to) === 'Active').length,
    [rows]
  )
  const expiringSoonCount = useMemo(
    () => rows.filter((r) => getPolicyStatus(r.valid_to) === 'Expiring Soon').length,
    [rows]
  )
  const expiredCount = useMemo(
    () => rows.filter((r) => getPolicyStatus(r.valid_to) === 'Expired').length,
    [rows]
  )

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Text search
      if (search) {
        const q = search.toLowerCase()
        const hit =
          (r.id ?? '').toLowerCase().includes(q) ||
          (r.file_number ?? '').toLowerCase().includes(q) ||
          (r.payee_name ?? '').toLowerCase().includes(q) ||
          (r.remarks ?? '').toLowerCase().includes(q) ||
          (r.cheque_no ?? '').toLowerCase().includes(q) ||
          (r.utr_no ?? '').toLowerCase().includes(q)
        if (!hit) return false
      }
      // Date from/to on payment_date
      if (filterDateFrom && r.payment_date < filterDateFrom) return false
      if (filterDateTo && r.payment_date > filterDateTo) return false
      // Policy status
      if (filterStatus && getPolicyStatus(r.valid_to) !== filterStatus) return false
      // Mode
      if (filterMode && r.mode !== filterMode) return false
      // Amount range
      const amt = Number(r.amount)
      if (filterAmtMin && amt < Number(filterAmtMin)) return false
      if (filterAmtMax && amt > Number(filterAmtMax)) return false
      return true
    })
  }, [rows, search, filterDateFrom, filterDateTo, filterStatus, filterMode, filterAmtMin, filterAmtMax])

  const hasActiveFilters =
    !!search || !!filterDateFrom || !!filterDateTo || !!filterStatus || !!filterMode || !!filterAmtMin || !!filterAmtMax

  const resetFilters = () => {
    setSearch('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterStatus('')
    setFilterMode('')
    setFilterAmtMin('')
    setFilterAmtMax('')
    setPage(1)
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))

  const pageNumbers = useMemo(() => {
    const delta = 2
    const range: number[] = []
    for (let i = Math.max(1, safePage - delta); i <= Math.min(totalPages, safePage + delta); i++) {
      range.push(i)
    }
    return range
  }, [safePage, totalPages])

  // ── Export helpers ────────────────────────────────────────────────────────
  const buildExportData = () =>
    filteredRows.map((r) => ({
      ID: r.id,
      'File No.': r.file_number,
      'Insurance Company': r.payee_name,
      'Amount (₹)': Number(r.amount),
      Mode: r.mode,
      'Payment Date': fmtDate(r.payment_date),
      'Valid Until': fmtDate(r.valid_to),
      'Policy Status': getPolicyStatus(r.valid_to),
      Remarks: r.remarks ?? '',
    }))

  const handleExportExcel = () => {
    const data = buildExportData()
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Insurance Payments')
    XLSX.writeFile(wb, `insurance_payments_${Date.now()}.xlsx`)
  }

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const reportDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    })
    // Header
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Insurance Payments Report', 14, 18)
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${reportDate}  |  Records: ${filteredRows.length}`, 14, 26)

    const data = buildExportData()
    autoTable(doc, {
      startY: 32,
      head: [Object.keys(data[0] ?? {})],
      body: data.map((row) => Object.values(row).map(String)),
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
      styles: { fontSize: 8, cellPadding: 3 },
    })
    doc.save(`insurance_payments_${Date.now()}.pdf`)
  }

  // ── Mail to Admin ─────────────────────────────────────────────────────────
  const handleSendMail = async () => {
    if (!mailForm.subject.trim()) {
      alert('Subject is mandatory.')
      return
    }
    if (selectedAdminIds.length === 0) {
      alert('Please select at least one administrator to notify.')
      return
    }
    setMailSending(true)
    try {
      const payload: Record<string, unknown> = {
        subject: mailForm.subject,
        message: mailForm.message,
        admin_ids: selectedAdminIds,
        page_context: 'Insurance Payments',
      }
      if (mailForm.includeSummary) {
        payload.summary = {
          total_records: filteredRows.length,
          total_premiums_paid: totalPremiums,
          active_policies: activeCount,
          expiring_soon: expiringSoonCount,
          expired_policies: expiredCount,
        }
      }
      await api.post('/notifications/notify-admin', payload)
      setShowMail(false)
      setMailForm({
        subject: `Insurance Payments Summary — ${new Date().toLocaleDateString('en-IN')}`,
        message: '',
        includeSummary: true,
      })
      alert('Message sent to admin successfully.')
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send message. Please try again.'
      alert(`Error: ${msg}`)
    } finally {
      setMailSending(false)
    }
  }

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const openEdit = (r: InsurancePayment) => {
    setEditRow(r)
    setEditForm({
      payee_name: r.payee_name || '',
      amount: String(r.amount || ''),
      mode: r.mode || 'UPI',
      payment_date: r.payment_date || '',
      valid_to: r.valid_to || '',
      remarks: r.remarks || '',
      cheque_no: r.cheque_no || '',
      utr_no: r.utr_no || '',
    })
  }

  const handleEditSave = async () => {
    if (!editRow) return
    try {
      await insurancePaymentsApi.update(editRow.id, {
        payee_name: editForm.payee_name,
        amount: Number(editForm.amount),
        mode: editForm.mode,
        payment_date: editForm.payment_date || null,
        valid_to: editForm.valid_to || null,
        cheque_no: editForm.cheque_no || null,
        utr_no: editForm.utr_no || null,
        remarks: editForm.remarks || null,
      })
      setRows(rows.map(r => r.id === editRow.id ? { ...r, ...editForm, amount: Number(editForm.amount) } : r))
      setEditRow(null)
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to update insurance payment')
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        title="Insurance Payments"
        subtitle="Read-only view of insurance premium payments and policy coverage"
      />

      {/* ── Expiring Soon Warning Banner ── */}
      {expiringSoonCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#b45309',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
          }}
        >
          <AlertTriangle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
            ⚠️ <strong>{expiringSoonCount} {expiringSoonCount === 1 ? 'policy' : 'policies'}</strong>{' '}
            {expiringSoonCount === 1 ? 'is' : 'are'} expiring within the next 7 days. Please notify the admin.
          </div>
          <button
            className="btn btn-outline btn-sm"
            style={{ borderColor: '#f59e0b', color: '#b45309', fontSize: '0.78rem' }}
            onClick={() => { setFilterStatus('Expiring Soon'); setPage(1) }}
          >
            View Expiring
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="pay-kpi-row-4">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue">
            <IndianRupee size={20} />
          </div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Premiums Paid</div>
            <div className="pay-kpi-value" style={{ color: 'var(--brand-700)' }}>
              {fmtAmount(totalPremiums)}
            </div>
            <div className="pay-kpi-sub">{rows.length} total records</div>
          </div>
        </div>

        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green">
            <ShieldAlert size={20} />
          </div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Active Policies</div>
            <div className="pay-kpi-value" style={{ color: '#15803d' }}>
              {activeCount}
            </div>
            <div className="pay-kpi-sub">Currently valid &amp; covered</div>
          </div>
        </div>

        <div className="pay-kpi-card">
          <div className="pay-kpi-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <AlertTriangle size={20} />
          </div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Expiring Soon</div>
            <div className="pay-kpi-value" style={{ color: '#b45309' }}>
              {expiringSoonCount}
            </div>
            <div className="pay-kpi-sub">Within next 7 days</div>
          </div>
        </div>

        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red">
            <CalendarClock size={20} />
          </div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Expired Policies</div>
            <div className="pay-kpi-value" style={{ color: '#b91c1c' }}>
              {expiredCount}
            </div>
            <div className="pay-kpi-sub">Requires renewal attention</div>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {/* Search */}
        <div style={{ flex: '1 1 220px', minWidth: 200 }}>
          <input
            className="form-input"
            placeholder="Search by ID, file no., company, remarks, cheque / UTR…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ width: '100%' }}
          />
        </div>

        {/* Advanced toggle */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowAdvanced((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced Filters
        </button>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={resetFilters}
            style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#ef4444' }}
          >
            <RotateCcw size={13} />
            Reset Filters
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            title="Export to Excel"
          >
            <Download size={14} />
            Export Excel
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            title="Export to PDF"
          >
            <FileText size={14} />
            Export PDF
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowMail(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Mail size={14} />
            Mail to Admin
          </button>
        </div>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showAdvanced && (
        <div
          className="data-card"
          style={{ marginBottom: 16, padding: '16px 20px' }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment Date From</label>
              <input
                type="date"
                className="form-input"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment Date To</label>
              <input
                type="date"
                className="form-input"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Policy Status</label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value as '' | PolicyStatus); setPage(1) }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Expiring Soon">Expiring Soon</option>
                <option value="Expired">Expired</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment Mode</label>
              <select
                className="form-select"
                value={filterMode}
                onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}
              >
                <option value="">All Modes</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Min (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1000"
                value={filterAmtMin}
                onChange={(e) => { setFilterAmtMin(e.target.value); setPage(1) }}
                min={0}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Max (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 50000"
                value={filterAmtMax}
                onChange={(e) => { setFilterAmtMax(e.target.value); setPage(1) }}
                min={0}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Data Table ── */}
      <div className="data-card">
        {loading ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: 'var(--gray-500)',
              fontSize: '0.95rem',
            }}
          >
            Loading insurance payments…
          </div>
        ) : error ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: '#b91c1c',
              fontSize: '0.95rem',
            }}
          >
            {error}
          </div>
        ) : filteredRows.length === 0 ? (
          <div
            style={{
              padding: '60px 0',
              textAlign: 'center',
              color: 'var(--gray-400)',
              fontSize: '0.95rem',
            }}
          >
            No insurance payment records match the current filters.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 42 }}>#</th>
                    <th>ID</th>
                    <th>File No.</th>
                    <th>Insurance Company</th>
                    <th>Amount</th>
                    <th>Policy Status</th>
                    <th>Mode</th>
                    <th>Payment Date</th>
                    <th>Valid Until</th>
                    <th style={{ textAlign: 'center', width: 64 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((r, idx) => {
                    const status = getPolicyStatus(r.valid_to)
                    return (
                      <tr key={r.id}>
                        <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                          {(safePage - 1) * pageSize + idx + 1}
                        </td>
                        <td
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.78rem',
                            color: 'var(--gray-500)',
                          }}
                        >
                          {r.id.slice(0, 8)}…
                        </td>
                        <td>
                          <span
                            style={{
                              background: 'var(--brand-500, #6366f1)',
                              color: '#fff',
                              borderRadius: 4,
                              padding: '2px 7px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {r.file_number || '—'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>
                          {r.payee_name || '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                          {fmtAmount(r.amount)}
                        </td>
                        <td>
                          <span
                            style={{
                              ...statusBadgeStyle(status),
                              display: 'inline-block',
                              borderRadius: 20,
                              padding: '2px 10px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {status}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              background: 'var(--gray-100)',
                              color: 'var(--gray-700)',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: '0.78rem',
                              fontWeight: 500,
                            }}
                          >
                            {r.mode || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--gray-600)' }}>
                          {fmtDate(r.payment_date)}
                        </td>
                        <td
                          style={{
                            fontSize: '0.84rem',
                            color:
                              status === 'Expired'
                                ? '#b91c1c'
                                : status === 'Expiring Soon'
                                ? '#b45309'
                                : 'var(--gray-600)',
                            fontWeight: status !== 'Active' ? 600 : 400,
                          }}
                        >
                          {fmtDate(r.valid_to)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="View details"
                              onClick={() => setViewRow(r)}
                              style={{ padding: '4px 8px' }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title="Edit"
                              onClick={() => openEdit(r)}
                              style={{ padding: '4px 8px', color: '#4f46e5' }}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination Bar ── */}
            <div className="pagination-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="pagination-info">
                  Showing{' '}
                  {Math.min((safePage - 1) * pageSize + 1, filteredRows.length)}–
                  {Math.min(safePage * pageSize, filteredRows.length)} of{' '}
                  {filteredRows.length} records
                </span>
                <select
                  className="page-size-select"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s} / page</option>
                  ))}
                </select>
              </div>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  onClick={() => goToPage(1)}
                  disabled={safePage === 1}
                  title="First page"
                >
                  <ChevronsLeft size={14} />
                </button>
                <button
                  className="page-btn"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>

                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    className={`page-btn${n === safePage ? ' active' : ''}`}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ))}

                <button
                  className="page-btn"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  title="Next page"
                >
                  <ChevronRight size={14} />
                </button>
                <button
                  className="page-btn"
                  onClick={() => goToPage(totalPages)}
                  disabled={safePage === totalPages}
                  title="Last page"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Detail View Modal ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div
            className="modal"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Insurance Payment — Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                {[
                  { label: 'ID', val: viewRow.id },
                  { label: 'File Number', val: viewRow.file_number || '—' },
                  { label: 'Insurance Company', val: viewRow.payee_name || '—', full: true },
                  { label: 'Amount', val: fmtAmount(viewRow.amount) },
                  { label: 'Policy Status', val: getPolicyStatus(viewRow.valid_to) },
                  { label: 'Payment Mode', val: viewRow.mode || '—' },
                  { label: 'Payment Date', val: fmtDate(viewRow.payment_date) },
                  { label: 'Valid Until', val: fmtDate(viewRow.valid_to) },
                  ...(viewRow.cheque_no
                    ? [{ label: 'Cheque No.', val: viewRow.cheque_no }]
                    : []),
                  ...(viewRow.utr_no
                    ? [{ label: 'UTR No.', val: viewRow.utr_no }]
                    : []),
                  { label: 'Remarks', val: viewRow.remarks || '—', full: true },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={item.full ? { gridColumn: '1 / -1' } : {}}
                  >
                    <div
                      style={{
                        fontSize: '0.73rem',
                        fontWeight: 600,
                        color: 'var(--gray-500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 3,
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: 'var(--gray-800)',
                        fontWeight: item.label === 'Amount' ? 700 : 400,
                      }}
                    >
                      {item.label === 'Policy Status' ? (
                        <span
                          style={{
                            ...statusBadgeStyle(getPolicyStatus(viewRow.valid_to)),
                            display: 'inline-block',
                            borderRadius: 20,
                            padding: '2px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          {item.val}
                        </span>
                      ) : (
                        item.val
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mail to Admin Modal ── */}
      {showMail && (
        <div className="modal-backdrop" onClick={() => setShowMail(false)}>
          <div
            className="modal"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} style={{ color: 'var(--brand-500)' }} />
                Mail to Admin
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowMail(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notify Admins <span style={{ color: '#ef4444' }}>*</span></span>
                  {adminsList.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 500, color: 'var(--brand-600)', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={selectedAdminIds.length === adminsList.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedAdminIds(adminsList.map(a => a.id));
                          } else {
                            setSelectedAdminIds([]);
                          }
                        }}
                        style={{ width: 12, height: 12, accentColor: 'var(--brand-600)' }}
                      />
                      Select All
                    </label>
                  )}
                </label>
                {loadingAdmins ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', padding: '6px 0' }}>Loading administrators...</div>
                ) : adminsList.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#ef4444', padding: '6px 0' }}>No active administrators found in system.</div>
                ) : (
                  <div style={{
                    border: '1.5px solid var(--gray-200)',
                    borderRadius: 8,
                    maxHeight: 120,
                    overflowY: 'auto',
                    padding: '8px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    background: 'var(--gray-50)'
                  }}>
                    {adminsList.map(admin => {
                      const isChecked = selectedAdminIds.includes(admin.id);
                      return (
                        <label key={admin.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--gray-700)', userSelect: 'none' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                  setSelectedAdminIds(prev => prev.filter(id => id !== admin.id));
                              } else {
                                  setSelectedAdminIds(prev => [...prev, admin.id]);
                              }
                            }}
                            style={{ width: 14, height: 14, accentColor: 'var(--brand-600)' }}
                          />
                          <span>
                            <strong>{admin.first_name} {admin.last_name || ''}</strong> <span style={{ color: 'var(--gray-400)', fontSize: '0.74rem' }}>({admin.email})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Subject <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="form-input"
                  value={mailForm.subject}
                  onChange={(e) =>
                    setMailForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  rows={5}
                  placeholder="Write your message to the admin…"
                  value={mailForm.message}
                  onChange={(e) =>
                    setMailForm((f) => ({ ...f, message: e.target.value }))
                  }
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  background: 'var(--gray-100)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.875rem',
                  color: 'var(--gray-700)',
                  cursor: 'pointer',
                }}
                onClick={() =>
                  setMailForm((f) => ({ ...f, includeSummary: !f.includeSummary }))
                }
              >
                <input
                  type="checkbox"
                  checked={mailForm.includeSummary}
                  onChange={(e) =>
                    setMailForm((f) => ({ ...f, includeSummary: e.target.checked }))
                  }
                  style={{ accentColor: 'var(--brand-500)', width: 15, height: 15 }}
                />
                <span>
                  Include summary stats (totals, active, expiring, expired counts)
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowMail(false)}
                disabled={mailSending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSendMail}
                disabled={mailSending || !mailForm.subject.trim() || selectedAdminIds.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Mail size={14} />
                {mailSending ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Insurance Payment Modal ── */}
      {editRow && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Insurance Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid-2">
                <div className="form-group modal-full">
                  <label className="form-label">Insurance Company Name</label>
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
                  <label className="form-label">Valid Until (Expiry)</label>
                  <input type="date" className="form-input" value={editForm.valid_to}
                    onChange={(e) => setEditForm(p => ({ ...p, valid_to: e.target.value }))} />
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
              <button className="btn btn-primary btn-sm" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
