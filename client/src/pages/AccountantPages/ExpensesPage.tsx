import { useEffect, useMemo, useState } from 'react'
import {
  Search, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ChevronDown, ChevronUp, FileSpreadsheet, FileDown, Mail,
  TrendingDown, Hash, Calculator, Tag, Calendar,
  User,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { expensesApi, usersSettingsApi } from '../../api/services'
import api from '../../api/axios'

// ── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string
  amount: number
  expense_date: string
  remarks: string | null
  created_at: string
  expense_category_name: string
  file_number: string
  created_by_name: string
}

interface AdvancedFilters {
  dateFrom: string
  dateTo: string
  category: string
  amountMin: string
  amountMax: string
  createdBy: string
}

const DEFAULT_FILTERS: AdvancedFilters = {
  dateFrom: '',
  dateTo: '',
  category: '',
  amountMin: '',
  amountMax: '',
  createdBy: '',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const fmtId = (id: string) =>
  uuidRe.test(id) ? `EXP-${id.slice(0, 8).toUpperCase()}` : id

const fmtAmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtDate = (d: string) => {
  if (!d) return '—'
  const dt = new Date(d)
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const categoryColor = (name: string): { bg: string; color: string } => {
  const palette = [
    { bg: '#eff6ff', color: '#1d4ed8' },
    { bg: '#fef3c7', color: '#92400e' },
    { bg: '#dcfce7', color: '#15803d' },
    { bg: '#fce7f3', color: '#9d174d' },
    { bg: '#ede9fe', color: '#6d28d9' },
    { bg: '#fff7ed', color: '#9a3412' },
    { bg: '#f0fdf4', color: '#166534' },
    { bg: '#fdf2f8', color: '#86198f' },
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return palette[h % palette.length]
}

const hasActiveFilters = (af: AdvancedFilters, search: string) =>
  search !== '' ||
  af.dateFrom !== '' ||
  af.dateTo !== '' ||
  af.category !== '' ||
  af.amountMin !== '' ||
  af.amountMax !== '' ||
  af.createdBy !== ''

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, accent,
}: {
  label: string
  value: string
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div
      className="pay-kpi-card"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
          {label}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-.3px' }}>
        {value}
      </div>
    </div>
  )
}

function Pagination({
  total, page, pageSize, onPage, onPageSize,
}: {
  total: number; page: number; pageSize: number
  onPage: (p: number) => void; onPageSize: (s: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const end = Math.min(page * pageSize, total)
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
          {[5, 10, 20].map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
          ) : (
            <button
              key={p}
              className={`page-btn${page === p ? ' active' : ''}`}
              onClick={() => onPage(p as number)}
            >
              {p}
            </button>
          )
        )}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  // Data
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filters
  const [search, setSearch] = useState('')
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<AdvancedFilters>(DEFAULT_FILTERS)

  // Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Mail modal
  const [mailOpen, setMailOpen] = useState(false)
  const [mailSubject, setMailSubject] = useState(
    `Expenses Summary — ${new Date().toLocaleDateString('en-IN')}`
  )
  const [mailMessage, setMailMessage] = useState('')
  const [mailIncludeStats, setMailIncludeStats] = useState(true)
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

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    expensesApi.list()
      .then((data) => {
        if (!active) return
        setRows(data)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load expenses.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  // ── Derived categories for filter dropdown ─────────────────────────────────

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((r) => { if (r.expense_category_name) seen.add(r.expense_category_name) })
    return Array.from(seen).sort()
  }, [rows])

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const amtMin = adv.amountMin !== '' ? Number(adv.amountMin) : null
    const amtMax = adv.amountMax !== '' ? Number(adv.amountMax) : null

    return rows.filter((e) => {
      // Text search
      if (q) {
        const haystack = [
          e.id, e.expense_category_name, e.file_number,
          e.remarks ?? '', e.created_by_name,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      // Date range
      if (adv.dateFrom && e.expense_date < adv.dateFrom) return false
      if (adv.dateTo && e.expense_date > adv.dateTo) return false
      // Category
      if (adv.category && e.expense_category_name !== adv.category) return false
      // Amount range
      if (amtMin !== null && e.amount < amtMin) return false
      if (amtMax !== null && e.amount > amtMax) return false
      // Created by
      if (adv.createdBy && !e.created_by_name.toLowerCase().includes(adv.createdBy.toLowerCase())) return false
      return true
    })
  }, [rows, search, adv])

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const resetPage = () => setPage(1)

  // ── KPI stats (on filtered data) ───────────────────────────────────────────

  const totalAmt = filtered.reduce((s, e) => s + e.amount, 0)
  const avgAmt = filtered.length > 0 ? totalAmt / filtered.length : 0

  // ── Helpers for filters ────────────────────────────────────────────────────

  const setAdvField = <K extends keyof AdvancedFilters>(key: K, val: AdvancedFilters[K]) => {
    setAdv((prev) => ({ ...prev, [key]: val }))
    resetPage()
  }

  const resetAllFilters = () => {
    setSearch('')
    setAdv(DEFAULT_FILTERS)
    resetPage()
  }

  const filtersActive = hasActiveFilters(adv, search)

  // ── Export Excel ───────────────────────────────────────────────────────────

  const exportExcel = () => {
    const data = filtered.map((e) => ({
      ID: fmtId(e.id),
      Date: e.expense_date,
      Category: e.expense_category_name,
      'File No.': e.file_number || '—',
      'Amount (₹)': e.amount,
      'Created By': e.created_by_name,
      Remarks: e.remarks ?? '',
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 14 },
      { wch: 14 }, { wch: 20 }, { wch: 32 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
    XLSX.writeFile(wb, `Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export PDF ─────────────────────────────────────────────────────────────

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

    // Header
    doc.setFontSize(16)
    doc.setTextColor(40, 40, 40)
    doc.text('Expenses Report', 14, 16)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Generated: ${now}  |  Total records: ${filtered.length}  |  Total: ₹${totalAmt.toLocaleString('en-IN')}`, 14, 23)

    autoTable(doc, {
      startY: 28,
      head: [['#', 'ID', 'Date', 'Category', 'File No.', 'Amount (₹)', 'Created By', 'Remarks']],
      body: filtered.map((e, i) => [
        i + 1,
        fmtId(e.id),
        e.expense_date,
        e.expense_category_name,
        e.file_number || '—',
        e.amount.toLocaleString('en-IN'),
        e.created_by_name,
        e.remarks ?? '',
      ]),
      headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 248, 255] },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    doc.save(`Expenses_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const sendMail = async () => {
    if (!mailSubject.trim()) {
      alert('Subject is mandatory.')
      return
    }
    if (selectedAdminIds.length === 0) {
      alert('Please select at least one administrator to notify.')
      return
    }
    setMailSending(true)
    try {
      let body = mailMessage

      if (mailIncludeStats) {
        body +=
          `\n\n--- Summary Stats ---` +
          `\nTotal Expenses  : ${fmtAmt(totalAmt)}` +
          `\nTotal Records   : ${filtered.length}` +
          `\nAverage Expense : ${fmtAmt(avgAmt)}` +
          (adv.dateFrom || adv.dateTo
            ? `\nDate Range      : ${adv.dateFrom || '—'} to ${adv.dateTo || '—'}`
            : '')
      }

      await api.post('/notifications/notify-admin', {
        subject: mailSubject,
        message: body,
        admin_ids: selectedAdminIds,
        page_context: 'Expenses',
      })

      setMailOpen(false)
      setMailMessage('')
      setMailIncludeStats(true)
      alert('Message sent to admin successfully.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send mail to admin.')
    } finally {
      setMailSending(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
            Expenses
          </h1>
          <p style={{ fontSize: '.82rem', color: 'var(--gray-500)', margin: '2px 0 0' }}>
            Read-only view of all recorded company expenses
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={exportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileSpreadsheet size={14} /> Export Excel
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={exportPdf}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <FileDown size={14} /> Export PDF
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setMailOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-600)', border: 'none' }}
          >
            <Mail size={14} /> Mail to Admin
          </button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="pay-kpi-row">
        <KpiCard
          label="Total Expenses"
          value={fmtAmt(totalAmt)}
          icon={<TrendingDown size={16} />}
          accent="#f43f5e"
        />
        <KpiCard
          label="Total Transactions"
          value={filtered.length.toLocaleString('en-IN')}
          icon={<Hash size={16} />}
          accent="#3b82f6"
        />
        <KpiCard
          label="Average Expense"
          value={fmtAmt(avgAmt)}
          icon={<Calculator size={16} />}
          accent="#f59e0b"
        />
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          padding: '12px 16px', background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-md)', color: '#b91c1c', fontSize: '.85rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', lineHeight: 1, fontSize: '1.1rem' }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Data Card ───────────────────────────────────────────────────── */}
      <div className="data-card">

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-900)' }}>
            All Expenses
            <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>
              {filtered.length} records
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', pointerEvents: 'none' }} />
              <input
                placeholder="Search ID, category, file, staff…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage() }}
                style={{
                  padding: '8px 12px 8px 32px', border: '1.5px solid var(--gray-200)',
                  borderRadius: 8, fontSize: '.84rem', outline: 'none', fontFamily: 'inherit', width: 240,
                  transition: 'border-color .15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--gray-200)')}
              />
            </div>
            {/* Advanced Filters toggle */}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setAdvOpen((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              Advanced Filters
              {advOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {/* Reset */}
            {filtersActive && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={resetAllFilters}
                style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#b91c1c' }}
              >
                <X size={13} /> Reset
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {advOpen && (
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--gray-100)',
            background: 'var(--surface-1)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12,
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Date From</label>
              <input
                type="date"
                className="form-input"
                value={adv.dateFrom}
                onChange={(e) => setAdvField('dateFrom', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Date To</label>
              <input
                type="date"
                className="form-input"
                value={adv.dateTo}
                onChange={(e) => setAdvField('dateTo', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Category</label>
              <select
                className="form-select"
                value={adv.category}
                onChange={(e) => setAdvField('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Amount Min (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={adv.amountMin}
                onChange={(e) => setAdvField('amountMin', e.target.value)}
                min={0}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Amount Max (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="∞"
                value={adv.amountMax}
                onChange={(e) => setAdvField('amountMax', e.target.value)}
                min={0}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '.72rem' }}>Created By</label>
              <input
                type="text"
                className="form-input"
                placeholder="Staff name…"
                value={adv.createdBy}
                onChange={(e) => setAdvField('createdBy', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '.85rem' }}>
            Loading expenses…
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  {['#', 'ID', 'Date', 'Category', 'File No.', 'Amount', 'Created By', 'Remarks'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left', padding: '11px 14px',
                        fontSize: '.71rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '.5px', color: 'var(--gray-500)',
                        background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-100)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)', fontSize: '.88rem' }}
                    >
                      {filtersActive ? 'No expenses match your filters.' : 'No expenses found.'}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const cc = categoryColor(row.expense_category_name)
                    const rowNum = (safePage - 1) * pageSize + idx + 1
                    return (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid var(--gray-100)', transition: 'background .12s' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-1)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                      >
                        {/* # */}
                        <td style={{ padding: '11px 14px', color: 'var(--gray-400)', fontWeight: 500, fontSize: '.78rem' }}>
                          {rowNum}
                        </td>
                        {/* ID */}
                        <td
                          title={row.id}
                          style={{ padding: '11px 14px', color: 'var(--brand-700)', fontWeight: 700, fontFamily: 'monospace', fontSize: '.8rem', whiteSpace: 'nowrap' }}
                        >
                          {fmtId(row.id)}
                        </td>
                        {/* Date */}
                        <td style={{ padding: '11px 14px', color: 'var(--gray-600)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={12} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                          {fmtDate(row.expense_date)}
                        </td>
                        {/* Category */}
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '3px 10px', borderRadius: 'var(--radius-full)',
                            fontSize: '.73rem', fontWeight: 600,
                            background: cc.bg, color: cc.color, whiteSpace: 'nowrap',
                          }}>
                            <Tag size={10} />{row.expense_category_name}
                          </span>
                        </td>
                        {/* File No. */}
                        <td style={{ padding: '11px 14px' }}>
                          {row.file_number
                            ? <span style={{ color: 'var(--brand-600)', fontWeight: 600, fontSize: '.82rem' }}>{row.file_number}</span>
                            : <span style={{ color: 'var(--gray-300)', fontSize: '.8rem' }}>—</span>
                          }
                        </td>
                        {/* Amount */}
                        <td style={{ padding: '11px 14px', fontWeight: 800, color: '#b91c1c', whiteSpace: 'nowrap' }}>
                          {fmtAmt(row.amount)}
                        </td>
                        {/* Created By */}
                        <td style={{ padding: '11px 14px', color: 'var(--gray-700)', fontSize: '.83rem' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <User size={12} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
                            {row.created_by_name}
                          </span>
                        </td>
                        {/* Remarks */}
                        <td
                          style={{ padding: '11px 14px', color: 'var(--gray-500)', fontSize: '.8rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={row.remarks ?? ''}
                        >
                          {row.remarks || <span style={{ color: 'var(--gray-300)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <Pagination
            total={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        )}
      </div>

      {/* ── Mail to Admin Modal ──────────────────────────────────────────── */}
      {mailOpen && (
        <div
          className="modal-backdrop"
          onClick={() => { if (!mailSending) setMailOpen(false) }}
        >
          <div
            className="modal"
            style={{ maxWidth: 520 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} style={{ color: 'var(--brand-600)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Mail to Admin</h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setMailOpen(false)}
                disabled={mailSending}
              >
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
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="Subject…"
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  rows={5}
                  value={mailMessage}
                  onChange={(e) => setMailMessage(e.target.value)}
                  placeholder="Type your message to the admin…"
                  style={{ resize: 'vertical', width: '100%' }}
                />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem', color: 'var(--gray-700)' }}>
                <input
                  type="checkbox"
                  checked={mailIncludeStats}
                  onChange={(e) => setMailIncludeStats(e.target.checked)}
                  style={{ accentColor: 'var(--brand-600)' }}
                />
                Include summary stats (total, count, average)
              </label>

              {/* Preview stats */}
              {mailIncludeStats && (
                <div style={{
                  padding: '10px 14px', background: 'var(--surface-1)',
                  border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-sm)',
                  fontSize: '.8rem', color: 'var(--gray-600)',
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#b91c1c', fontSize: '.9rem' }}>{fmtAmt(totalAmt)}</div>
                    <div style={{ color: 'var(--gray-400)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.4px' }}>Total</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '.9rem' }}>{filtered.length}</div>
                    <div style={{ color: 'var(--gray-400)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.4px' }}>Records</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: '.9rem' }}>{fmtAmt(avgAmt)}</div>
                    <div style={{ color: 'var(--gray-400)', fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.4px' }}>Average</div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setMailOpen(false)}
                disabled={mailSending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={sendMail}
                disabled={mailSending || !mailSubject.trim() || selectedAdminIds.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-600)', border: 'none' }}
              >
                <Mail size={14} />
                {mailSending ? 'Sending…' : 'Send Mail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
