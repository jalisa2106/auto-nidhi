import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { advancesApi, usersSettingsApi } from '../../api/services'
import api from '../../api/axios'

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Advance {
  id: string
  dealer_id: string | null
  broker_id: string | null
  party_type: 'dealer' | 'broker'
  party_name: string
  advance_date: string
  amount: number
  mode: 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'
  utr_cheque_number: string
  purpose: string
  recovery_status: 'pending' | 'partial' | 'fully_recovered'
  amount_recovered: number
  remarks: string
}

interface AdvanceWithOutstanding extends Advance {
  outstanding: number
}

interface Filters {
  dateFrom: string
  dateTo: string
  partyType: '' | 'dealer' | 'broker'
  mode: '' | 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'
  recoveryStatus: '' | 'pending' | 'partial' | 'fully_recovered'
  amountMin: string
  amountMax: string
}

interface MailForm {
  subject: string
  message: string
  includeSummary: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]
const MODES = ['cash', 'cheque', 'rtgs', 'neft', 'imps', 'upi'] as const

const STATUS_BADGE: Record<
  Advance['recovery_status'],
  { bg: string; color: string; label: string }
> = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  partial: { bg: '#dbeafe', color: '#1d4ed8', label: 'Partial' },
  fully_recovered: { bg: '#dcfce7', color: '#15803d', label: 'Fully Recovered' },
}

const EMPTY_FILTERS: Filters = {
  dateFrom: '',
  dateTo: '',
  partyType: '',
  mode: '',
  recoveryStatus: '',
  amountMin: '',
  amountMax: '',
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const isFilterActive = (f: Filters) =>
  Object.values(f).some((v) => v !== '')

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdvancesPage() {
  // ── Data state
  const [allRows, setAllRows] = useState<AdvanceWithOutstanding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Search & filter
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // ── Pagination
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // ── Mail modal
  const [mailOpen, setMailOpen] = useState(false)
  const [mailForm, setMailForm] = useState<MailForm>({
    subject: `Advances Summary — ${new Date().toLocaleDateString('en-IN')}`,
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

  // ── Fetch data
  useEffect(() => {
    setLoading(true)
    setError(null)
    advancesApi
      .list()
      .then((res: unknown) => {
        const raw: Advance[] = Array.isArray(res)
          ? (res as Advance[])
          : ((res as { data?: Advance[] })?.data ?? [])
        setAllRows(
          raw.map((r) => ({
            ...r,
            outstanding: r.amount - r.amount_recovered,
          }))
        )
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load advances'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Derived filtered rows
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allRows.filter((r) => {
      // text search
      if (
        q &&
        !r.id.toLowerCase().includes(q) &&
        !r.party_name.toLowerCase().includes(q) &&
        !r.purpose.toLowerCase().includes(q) &&
        !r.utr_cheque_number.toLowerCase().includes(q) &&
        !r.remarks.toLowerCase().includes(q)
      )
        return false

      // date from
      if (filters.dateFrom && r.advance_date < filters.dateFrom) return false
      // date to
      if (filters.dateTo && r.advance_date > filters.dateTo) return false
      // party type
      if (filters.partyType && r.party_type !== filters.partyType) return false
      // mode
      if (filters.mode && r.mode !== filters.mode) return false
      // recovery status
      if (filters.recoveryStatus && r.recovery_status !== filters.recoveryStatus) return false
      // amount min
      if (filters.amountMin !== '' && r.amount < Number(filters.amountMin)) return false
      // amount max
      if (filters.amountMax !== '' && r.amount > Number(filters.amountMax)) return false

      return true
    })
  }, [allRows, search, filters])

  // ── KPI stats (from filtered rows)
  const stats = useMemo(() => {
    const totalAdvanced = filteredRows.reduce((s, r) => s + r.amount, 0)
    const totalRecovered = filteredRows.reduce((s, r) => s + r.amount_recovered, 0)
    const totalOutstanding = filteredRows.reduce((s, r) => s + r.outstanding, 0)
    const pendingCount = filteredRows.filter((r) => r.recovery_status === 'pending').length
    return { totalAdvanced, totalRecovered, totalOutstanding, pendingCount }
  }, [filteredRows])

  // ── Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize)

  const goTo = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))

  // reset page when filters change
  useEffect(() => setPage(1), [search, filters, pageSize])

  // ── Page numbers to show
  const pageNumbers = useMemo(() => {
    const nums: (number | '…')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) nums.push(i)
    } else {
      nums.push(1)
      if (safePage > 3) nums.push('…')
      for (
        let i = Math.max(2, safePage - 1);
        i <= Math.min(totalPages - 1, safePage + 1);
        i++
      )
        nums.push(i)
      if (safePage < totalPages - 2) nums.push('…')
      nums.push(totalPages)
    }
    return nums
  }, [totalPages, safePage])

  // ── Export Excel
  const exportExcel = () => {
    const data = filteredRows.map((r) => ({
      ID: r.id,
      Date: r.advance_date,
      'Party Name': r.party_name,
      'Party Type': r.party_type,
      Amount: r.amount,
      Recovered: r.amount_recovered,
      Outstanding: r.outstanding,
      Mode: r.mode.toUpperCase(),
      Purpose: r.purpose,
      'Recovery Status': STATUS_BADGE[r.recovery_status]?.label ?? r.recovery_status,
      Remarks: r.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Advances')
    XLSX.writeFile(wb, `advances_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export PDF
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Advances Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['ID', 'Date', 'Party Name', 'Party Type', 'Amount', 'Recovered', 'Outstanding', 'Mode', 'Status'],
      ],
      body: filteredRows.map((r) => [
        r.id,
        r.advance_date,
        r.party_name,
        r.party_type,
        fmt(r.amount),
        fmt(r.amount_recovered),
        fmt(r.outstanding),
        r.mode.toUpperCase(),
        STATUS_BADGE[r.recovery_status]?.label ?? r.recovery_status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`advances_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // ── Mail to Admin
  const sendMail = async () => {
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
        page_context: 'Advances',
      }
      if (mailForm.includeSummary) {
        payload.summary = {
          total_advanced: stats.totalAdvanced,
          total_recovered: stats.totalRecovered,
          total_outstanding: stats.totalOutstanding,
          pending_count: stats.pendingCount,
          filtered_records: filteredRows.length,
        }
      }
      await api.post('/notifications/notify-admin', payload)
      setMailOpen(false)
      setMailForm({
        subject: `Advances Summary — ${new Date().toLocaleDateString('en-IN')}`,
        message: '',
        includeSummary: true,
      })
      alert('Mail sent to admin successfully.')
    } catch {
      alert('Failed to send mail to admin. Please try again.')
    } finally {
      setMailSending(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: '100%' }}>
      {/* ── Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--gray-900)' }}>
            Advances
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--gray-500)' }}>
            Read-only view of dealer &amp; broker advances and recovery status
          </p>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={exportExcel}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Export Excel
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportPDF}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
            Export PDF
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setMailOpen(true)}
            style={{ background: 'var(--brand-600)', display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Mail to Admin
          </button>
        </div>
      </div>

      {/* ─── Stat Cards */}
      <div className="pay-kpi-row" style={{ marginBottom: 24 }}>
        <div className="pay-kpi-card" style={{ borderTop: '3px solid #3b82f6' }}>
          <div className="pay-kpi-label">Total Advanced</div>
          <div className="pay-kpi-value" style={{ color: '#1d4ed8' }}>
            {fmt(stats.totalAdvanced)}
          </div>
          <div className="pay-kpi-sub">{filteredRows.length} records</div>
        </div>
        <div className="pay-kpi-card" style={{ borderTop: '3px solid #22c55e' }}>
          <div className="pay-kpi-label">Total Recovered</div>
          <div className="pay-kpi-value" style={{ color: '#15803d' }}>
            {fmt(stats.totalRecovered)}
          </div>
          <div className="pay-kpi-sub">Amount recovered so far</div>
        </div>
        <div className="pay-kpi-card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="pay-kpi-label">Outstanding</div>
          <div className="pay-kpi-value" style={{ color: '#dc2626' }}>
            {fmt(stats.totalOutstanding)}
          </div>
          <div className="pay-kpi-sub">Yet to be recovered</div>
        </div>
      </div>

      {/* ── Search & Filter Bar */}
      <div className="data-card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--gray-400)',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="form-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search ID, party, purpose, UTR/cheque, remarks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Toggle Advanced */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 5 }}>
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {showAdvanced ? 'Hide' : 'Advanced'} Filters
            {isFilterActive(filters) && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--brand-500)',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 10,
                  padding: '1px 6px',
                }}
              >
                ON
              </span>
            )}
          </button>

          {/* Reset */}
          {(isFilterActive(filters) || search) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444' }}
              onClick={() => {
                setSearch('')
                setFilters(EMPTY_FILTERS)
              }}
            >
              ✕ Reset Filters
            </button>
          )}
        </div>

        {/* Advanced Filter Panel */}
        {showAdvanced && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid var(--gray-200)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '12px 16px',
            }}
          >
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date From</label>
              <input
                type="date"
                className="form-input"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date To</label>
              <input
                type="date"
                className="form-input"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Party Type</label>
              <select
                className="form-select"
                value={filters.partyType}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    partyType: e.target.value as Filters['partyType'],
                  }))
                }
              >
                <option value="">All</option>
                <option value="dealer">Dealer</option>
                <option value="broker">Broker</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mode</label>
              <select
                className="form-select"
                value={filters.mode}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, mode: e.target.value as Filters['mode'] }))
                }
              >
                <option value="">All</option>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {m.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Recovery Status</label>
              <select
                className="form-select"
                value={filters.recoveryStatus}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    recoveryStatus: e.target.value as Filters['recoveryStatus'],
                  }))
                }
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="fully_recovered">Fully Recovered</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Min (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={filters.amountMin}
                onChange={(e) => setFilters((f) => ({ ...f, amountMin: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Max (₹)</label>
              <input
                type="number"
                className="form-input"
                placeholder="Any"
                value={filters.amountMax}
                onChange={(e) => setFilters((f) => ({ ...f, amountMax: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Data Table */}
      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: 'var(--gray-500)',
              fontSize: 15,
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--brand-500)"
              strokeWidth="2"
              style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }}
            >
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div>Loading advances…</div>
          </div>
        ) : error ? (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#dc2626',
              fontSize: 15,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ marginBottom: 12 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>{error}</div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)', fontSize: 15 }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gray-300)" strokeWidth="1.5" style={{ marginBottom: 12 }}>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <div>No advances match the current filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ minWidth: 960 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Recovered</th>
                  <th style={{ textAlign: 'right' }}>Outstanding</th>
                  <th>Mode</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, idx) => {
                  const badge = STATUS_BADGE[row.recovery_status]
                  const rowNum = (safePage - 1) * pageSize + idx + 1
                  return (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--gray-400)', fontSize: 13 }}>{rowNum}</td>
                      <td>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 12,
                            background: 'var(--gray-100)',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {row.id}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--gray-600)', fontSize: 13 }}>
                        {row.advance_date
                          ? new Date(row.advance_date).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--gray-800)' }}>
                            {row.party_name || '—'}
                          </span>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              padding: '1px 7px',
                              borderRadius: 999,
                              background:
                                row.party_type === 'dealer' ? '#ede9fe' : '#fce7f3',
                              color:
                                row.party_type === 'dealer' ? '#6d28d9' : '#be185d',
                              width: 'fit-content',
                            }}
                          >
                            {row.party_type}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gray-800)' }}>
                        {fmt(row.amount)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 500 }}>
                        {fmt(row.amount_recovered)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontWeight: 600,
                          color: row.outstanding > 0 ? '#dc2626' : '#15803d',
                        }}
                      >
                        {fmt(row.outstanding)}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: 'var(--gray-100)',
                            color: 'var(--gray-600)',
                          }}
                        >
                          {row.mode.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: badge?.bg,
                            color: badge?.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge?.label ?? row.recovery_status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination */}
        {!loading && !error && filteredRows.length > 0 && (
          <div className="pagination-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label className="pagination-info" style={{ marginRight: 4 }}>
                Rows per page:
              </label>
              <select
                className="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="pagination-info">
              {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length}
            </div>

            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button
                className="page-btn"
                onClick={() => goTo(1)}
                disabled={safePage === 1}
                title="First"
              >
                «
              </button>
              <button
                className="page-btn"
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 1}
                title="Previous"
              >
                ‹
              </button>
              {pageNumbers.map((n, i) =>
                n === '…' ? (
                  <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)' }}>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    className={`page-btn${n === safePage ? ' active' : ''}`}
                    onClick={() => goTo(n as number)}
                  >
                    {n}
                  </button>
                )
              )}
              <button
                className="page-btn"
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages}
                title="Next"
              >
                ›
              </button>
              <button
                className="page-btn"
                onClick={() => goTo(totalPages)}
                disabled={safePage === totalPages}
                title="Last"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Mail to Admin Modal */}
      {mailOpen && (
        <div className="modal-backdrop" onClick={() => !mailSending && setMailOpen(false)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, width: '100%' }}
          >
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Mail to Admin</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => !mailSending && setMailOpen(false)}
                style={{ padding: '4px 8px', fontSize: 18, lineHeight: 1 }}
              >
                ×
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
                  onChange={(e) => setMailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Enter subject"
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Message</label>
                <textarea
                  className="form-input"
                  rows={5}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  value={mailForm.message}
                  onChange={(e) => setMailForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Write your message to the admin…"
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  color: 'var(--gray-700)',
                }}
              >
                <input
                  type="checkbox"
                  checked={mailForm.includeSummary}
                  onChange={(e) =>
                    setMailForm((f) => ({ ...f, includeSummary: e.target.checked }))
                  }
                  style={{ width: 15, height: 15 }}
                />
                Include summary stats (totals &amp; counts)
              </label>

              {mailForm.includeSummary && (
                <div
                  style={{
                    marginTop: 12,
                    padding: '10px 14px',
                    background: 'var(--gray-100)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 12,
                    color: 'var(--gray-600)',
                    lineHeight: 1.7,
                  }}
                >
                  <strong>Preview:</strong>
                  <br />
                  Total Advanced: {fmt(stats.totalAdvanced)}
                  <br />
                  Total Recovered: {fmt(stats.totalRecovered)}
                  <br />
                  Outstanding: {fmt(stats.totalOutstanding)}
                  <br />
                  Pending Count: {stats.pendingCount}
                  <br />
                  Filtered Records: {filteredRows.length}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => !mailSending && setMailOpen(false)}
                disabled={mailSending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={sendMail}
                disabled={mailSending || !mailForm.subject.trim() || selectedAdminIds.length === 0}
                style={{ background: 'var(--brand-600)' }}
              >
                {mailSending ? 'Sending…' : 'Send Mail'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
