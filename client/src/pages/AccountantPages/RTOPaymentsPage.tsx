import React, { useEffect, useState, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { rtoPaymentsApi, usersSettingsApi } from '../../api/services';
import api from '../../api/axios';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RTOPayment {
  id: string;
  payment_date: string;
  payment_mode: 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi';
  amount: number;
  bank_account_no: string;
  ifsc_code: string;
  cheque_bank_name: string;
  branch_name: string;
  cheque_no: string;
  cheque_date: string;
  cheque_amount: number;
  utr_no: string;
  remarks: string;
  file_number: string;
  payee_dealer_name: string;
  payee_broker_name: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  paymentMode: string;
  amountMin: string;
  amountMax: string;
}

interface MailForm {
  subject: string;
  message: string;
  includeSummary: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_BADGE: Record<RTOPayment['payment_mode'], { bg: string; color: string }> = {
  cash:   { bg: '#dcfce7', color: '#15803d' },
  cheque: { bg: '#fef3c7', color: '#92400e' },
  rtgs:   { bg: '#ede9fe', color: '#6d28d9' },
  neft:   { bg: '#dbeafe', color: '#1d4ed8' },
  imps:   { bg: '#fce7f3', color: '#9d174d' },
  upi:    { bg: '#f0fdf4', color: '#166534' },
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];
const DEFAULT_PAGE_SIZE = 5;

const PAYMENT_MODES: RTOPayment['payment_mode'][] = ['cash', 'cheque', 'rtgs', 'neft', 'imps', 'upi'];

const EMPTY_FILTERS: Filters = {
  dateFrom: '',
  dateTo: '',
  paymentMode: '',
  amountMin: '',
  amountMax: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getPayee(row: RTOPayment): string {
  return row.payee_dealer_name || row.payee_broker_name || '—';
}

function filtersActive(f: Filters): boolean {
  return !!(f.dateFrom || f.dateTo || f.paymentMode || f.amountMin || f.amountMax);
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

interface ModeBadgeProps { mode: RTOPayment['payment_mode'] }
const ModeBadge: React.FC<ModeBadgeProps> = ({ mode }) => {
  const style = MODE_BADGE[mode] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span style={{
      backgroundColor: style.bg,
      color: style.color,
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
    }}>
      {mode}
    </span>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, accent, icon }) => (
  <div className="pay-kpi-card" style={{ borderTop: `3px solid ${accent}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 8,
        backgroundColor: accent + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--gray-900)', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}
const Pagination: React.FC<PaginationProps> = ({ total, page, pageSize, onPage, onPageSize }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = Math.min(total, (page - 1) * pageSize + 1);
  const end = Math.min(total, page * pageSize);

  const pages: (number | '…')[] = useMemo(() => {
    const arr: (number | '…')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push('…');
      arr.push(totalPages);
    }
    return arr;
  }, [totalPages, page]);

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        Showing {start}–{end} of {total} records
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First">«</button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev">‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)' }}>…</span>
            : <button
                key={p}
                className={`page-btn${page === p ? ' active' : ''}`}
                onClick={() => onPage(p as number)}
              >{p}</button>
        )}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next">›</button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last">»</button>
      </div>
      <select
        className="page-size-select"
        value={pageSize}
        onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
      >
        {PAGE_SIZE_OPTIONS.map(s => <option key={s} value={s}>{s} / page</option>)}
      </select>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RTOPaymentsPage: React.FC = () => {
  // Data state
  const [payments, setPayments] = useState<RTOPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Mail modal
  const [showMail, setShowMail] = useState(false);
  const [mailForm, setMailForm] = useState<MailForm>({
    subject: `RTO Payments Summary — ${new Date().toLocaleDateString('en-IN')}`,
    message: '',
    includeSummary: false,
  });
  const [mailSending, setMailSending] = useState(false);

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

  // ── Fetch ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await rtoPaymentsApi.list({ page: 1, limit: 500 });
        setPayments(res.data ?? []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load RTO payments.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Filtered rows ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter(p => {
      // Text search
      if (q) {
        const haystack = [p.id, p.file_number, p.payee_dealer_name, p.payee_broker_name, p.remarks]
          .join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Date from
      if (filters.dateFrom && p.payment_date < filters.dateFrom) return false;
      // Date to
      if (filters.dateTo && p.payment_date > filters.dateTo + 'T23:59:59') return false;
      // Payment mode
      if (filters.paymentMode && p.payment_mode !== filters.paymentMode) return false;
      // Amount min
      if (filters.amountMin !== '' && p.amount < Number(filters.amountMin)) return false;
      // Amount max
      if (filters.amountMax !== '' && p.amount > Number(filters.amountMax)) return false;
      return true;
    });
  }, [payments, search, filters]);

  // ── KPI stats ──
  const stats = useMemo(() => {
    const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);
    const count = filtered.length;
    const avg = count ? total / count : 0;
    return { total, count, avg };
  }, [filtered]);

  // ── Paginated rows ──
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ── Handlers ──
  const handleFilterChange = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ ...EMPTY_FILTERS });
    setSearch('');
    setPage(1);
  }, []);

  // ── Export Excel ──
  const exportExcel = useCallback(() => {
    const rows = filtered.map(p => ({
      'Payment ID': p.id,
      'File No.': p.file_number,
      'Payee': getPayee(p),
      'Amount (₹)': p.amount,
      'Mode': p.payment_mode.toUpperCase(),
      'Date': formatDate(p.payment_date),
      'Remarks': p.remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RTO Payments');
    XLSX.writeFile(wb, `rto-payments-${Date.now()}.xlsx`);
  }, [filtered]);

  // ── Export PDF ──
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const reportDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Header
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('RTO Payments Report', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${reportDate}  |  Total Records: ${filtered.length}  |  Total Amount: ${formatCurrency(stats.total)}`, 14, 23);

    autoTable(doc, {
      startY: 28,
      head: [['Payment ID', 'File No.', 'Payee', 'Amount (₹)', 'Mode', 'Date', 'Remarks']],
      body: filtered.map(p => [
        p.id,
        p.file_number || '—',
        getPayee(p),
        formatCurrency(p.amount),
        p.payment_mode.toUpperCase(),
        formatDate(p.payment_date),
        p.remarks || '—',
      ]),
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 36 },
        3: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`rto-payments-${Date.now()}.pdf`);
  }, [filtered, stats]);

  // ── Mail to Admin ──
  const handleMailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailForm.subject.trim()) {
      alert('Subject is mandatory.');
      return;
    }
    if (selectedAdminIds.length === 0) {
      alert('Please select at least one administrator to notify.');
      return;
    }
    setMailSending(true);
    try {
      const payload: Record<string, unknown> = {
        subject: mailForm.subject,
        message: mailForm.message,
        admin_ids: selectedAdminIds,
        page_context: 'RTO Payments',
      };
      if (mailForm.includeSummary) {
        payload.summary = {
          totalAmount: stats.total,
          totalTransactions: stats.count,
          averagePayment: stats.avg,
          filteredRecords: filtered.length,
        };
      }
      await api.post('/notifications/notify-admin', payload);
      setShowMail(false);
      setMailForm(prev => ({ ...prev, message: '', includeSummary: false }));
      alert('Message sent to admin successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send message.';
      alert(`Error: ${msg}`);
    } finally {
      setMailSending(false);
    }
  }, [mailForm, stats, filtered, selectedAdminIds]);

  // ── Render ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320, color: 'var(--gray-500)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ marginRight: 10, animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading RTO Payments…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ margin: 32, padding: 24, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        <span><strong>Error:</strong> {error}</span>
      </div>
    );
  }

  const isAnyFilterActive = filtersActive(filters) || search.trim() !== '';

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Page Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)' }}>RTO Payments</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--gray-500)' }}>Read-only view of all RTO payment records</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {/* Mail to Admin */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowMail(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/><path d="m2 7 9.293 6.293a1 1 0 0 0 1.414 0L22 7" stroke="currentColor" strokeWidth="2"/></svg>
            Mail to Admin
          </button>
          {/* Export Excel */}
          <button
            className="btn btn-outline btn-sm"
            onClick={exportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Export Excel
          </button>
          {/* Export PDF */}
          <button
            className="btn btn-outline btn-sm"
            onClick={exportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2"/><path d="M9 13h1.5a1.5 1.5 0 0 1 0 3H9v-3zm0 3v2m6-5v5m-3-5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="pay-kpi-row" style={{ marginBottom: 24 }}>
        <KpiCard
          label="Total Amount Paid"
          value={formatCurrency(stats.total)}
          accent="#3b82f6"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93V18h-2v1.93C7.06 19.44 4.56 16.94 4.07 14H6v-2H4.07C4.56 9.06 7.06 6.56 10 6.07V8h2V6.07c2.94.49 5.44 2.99 5.93 5.93H16v2h1.93c-.49 2.94-2.99 5.44-5.93 5.93z" fill="currentColor"/><path d="M13 10h-2v4h2v-4z" fill="currentColor"/></svg>
          }
        />
        <KpiCard
          label="Total Transactions"
          value={stats.count.toLocaleString('en-IN')}
          accent="#22c55e"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        />
        <KpiCard
          label="Average Payment"
          value={formatCurrency(stats.avg)}
          accent="#f59e0b"
          icon={
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          }
        />
      </div>

      {/* ── Search + Filters ── */}
      <div className="data-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}>
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input
              className="form-input"
              type="text"
              placeholder="Search by ID, file no., payee, remarks…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 34, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowAdvanced(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: showAdvanced ? 'var(--brand-600)' : undefined }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Advanced Filters
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" style={{ transform: showAdvanced ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}>
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {isAnyFilterActive && (
            <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Reset Filters
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--gray-200)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px 16px',
          }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date From</label>
              <input
                className="form-input"
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Date To</label>
              <input
                className="form-input"
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Payment Mode</label>
              <select
                className="form-select"
                value={filters.paymentMode}
                onChange={e => handleFilterChange('paymentMode', e.target.value)}
              >
                <option value="">All Modes</option>
                {PAYMENT_MODES.map(m => (
                  <option key={m} value={m}>{m.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Min (₹)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="0"
                value={filters.amountMin}
                onChange={e => handleFilterChange('amountMin', e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Amount Max (₹)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                placeholder="Any"
                value={filters.amountMax}
                onChange={e => handleFilterChange('amountMax', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: 48 }}>#</th>
                <th>Payment ID</th>
                <th>File No.</th>
                <th>Payee</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'center' }}>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }}>
                      <path d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    No records match the current filters
                  </td>
                </tr>
              ) : paginated.map((p, idx) => (
                <tr key={p.id} style={{ transition: 'background 0.15s' }}>
                  <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', background: 'var(--gray-100)', padding: '2px 7px', borderRadius: 4, color: 'var(--gray-700)' }}>
                      {p.id.slice(0, 8)}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>
                    {p.file_number || '—'}
                  </td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {getPayee(p)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--gray-900)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(p.amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <ModeBadge mode={p.payment_mode} />
                  </td>
                  <td style={{ color: 'var(--gray-600)', fontSize: '0.875rem' }}>
                    {formatDate(p.payment_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
        />
      </div>

      {/* ── Mail to Admin Modal ── */}
      {showMail && (
        <div className="modal-backdrop" onClick={() => !mailSending && setShowMail(false)}>
          <div className="modal" style={{ width: 500, maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="m2 7 9.293 6.293a1 1 0 0 0 1.414 0L22 7" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Mail to Admin
              </h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowMail(false)}
                disabled={mailSending}
                style={{ lineHeight: 1, padding: '4px 8px', fontSize: '1.2rem', color: 'var(--gray-400)' }}
              >×</button>
            </div>

            <form onSubmit={handleMailSubmit}>
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
                    type="text"
                    required
                    value={mailForm.subject}
                    onChange={e => setMailForm(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    required
                    placeholder="Write your message to the admin…"
                    value={mailForm.message}
                    onChange={e => setMailForm(prev => ({ ...prev, message: e.target.value }))}
                    style={{ resize: 'vertical', minHeight: 100 }}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: '0.875rem', color: 'var(--gray-700)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={mailForm.includeSummary}
                    onChange={e => setMailForm(prev => ({ ...prev, includeSummary: e.target.checked }))}
                    style={{ width: 15, height: 15, accentColor: 'var(--brand-600)', cursor: 'pointer' }}
                  />
                  Include summary stats (total, count, average)
                </label>

                {mailForm.includeSummary && (
                  <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--gray-800)' }}>Preview:</strong><br />
                    Total Amount: {formatCurrency(stats.total)}<br />
                    Total Transactions: {stats.count}<br />
                    Average Payment: {formatCurrency(stats.avg)}<br />
                    Filtered Records: {filtered.length}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowMail(false)} disabled={mailSending}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={mailSending || !mailForm.subject.trim() || selectedAdminIds.length === 0} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {mailSending ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .data-table th {
          padding: 11px 16px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--gray-500);
          background: var(--gray-50, #f9fafb);
          border-bottom: 1px solid var(--gray-200, #e5e7eb);
          white-space: nowrap;
        }
        .data-table td {
          padding: 11px 16px;
          font-size: 0.875rem;
          color: var(--gray-700);
          border-bottom: 1px solid var(--gray-100, #f3f4f6);
        }
        .data-table tbody tr:hover td {
          background: var(--gray-50, #f9fafb);
        }
        .data-table tbody tr:last-child td { border-bottom: none; }
      `}</style>
    </div>
  );
};

export default RTOPaymentsPage;
