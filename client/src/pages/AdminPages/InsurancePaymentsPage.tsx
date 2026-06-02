import { useMemo, useState, useEffect, type MouseEvent } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  ShieldAlert, IndianRupee, CalendarClock, Plus, X, Eye, Trash2, Pencil,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, AlertTriangle,
  FileSpreadsheet, FileDown
} from 'lucide-react'
import { message } from 'antd' 
import { insurancePaymentsApi, filesApi, bankAccountsApi, insuranceCompaniesApi } from '../../api/services'
import PageHeader from '../../components/app/PageHeader'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'


const SYSTEM_ANCHOR_DATE = "2026-05-26" 
const PAYMENT_MODES = ['Cash', 'Cheque', 'NEFT', 'RTGS', 'UPI', 'DD'] as const

type InsurancePaymentForm = {
  file_id: string
  insurance_company_id: string
  amount: string
  mode: string
  payment_date: string
  valid_to: string
  company_bank_id: string
  cheque_bank_name: string
  branch_name: string
  cheque_no: string
  cheque_date: string
  utr_no: string
  remarks: string
}

export default function InsurancePaymentsPage() {
  const role = localStorage.getItem('user_role') || 'admin'
  const isAdmin = role === 'admin'

  const [rows, setRows] = useState<any[]>([])
  const [files, setFiles] = useState<{ id: string; file_number: string; customer: string }[]>([])
  const [companyBanks, setCompanyBanks] = useState<any[]>([]) 
  const [insuranceCompanies, setInsuranceCompanies] = useState<any[]>([]) 
  
  const [showAdd, setShowAdd] = useState(false)
  const [viewRow, setViewRow] = useState<any | null>(null)
  const [editRow, setEditRow] = useState<any | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState('')
  const [filterStatus, setFilterStatus] = useState('') 
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf')

  const [form, setForm] = useState<InsurancePaymentForm>({
    file_id: '', insurance_company_id: '', amount: '', mode: 'UPI',
    payment_date: SYSTEM_ANCHOR_DATE, valid_to: '', company_bank_id: '', 
    cheque_bank_name: '', branch_name: '', cheque_no: '', cheque_date: '', utr_no: '', remarks: ''
  })

  const [editForm, setEditForm] = useState<InsurancePaymentForm>({
    file_id: '', insurance_company_id: '', amount: '', mode: 'UPI',
    payment_date: SYSTEM_ANCHOR_DATE, valid_to: '', company_bank_id: '', 
    cheque_bank_name: '', branch_name: '', cheque_no: '', cheque_date: '', utr_no: '', remarks: ''
  })

  const fetchPayments = async () => {
    try {
      const paymentData = await insurancePaymentsApi.list()
      const dataArray = Array.isArray(paymentData) ? paymentData : (paymentData.data || [])
      setRows(dataArray)
    } catch (err) {
      console.error("Failed to load insurance data:", err)
    }
  }

  const loadDropdownData = async () => {
    try {
      const filesRes = await filesApi.list(1, 1000) 
      setFiles(filesRes.data || [])
    } catch (err) {}
    
    try {
      const banksRes = await bankAccountsApi.list(1, 100)
      setCompanyBanks(banksRes.data || [])
    } catch (err) {}

    try {
      const companiesRes = await insuranceCompaniesApi.list() 
      setInsuranceCompanies(Array.isArray(companiesRes) ? companiesRes : (companiesRes.data || []))
    } catch (err) {}
  }

  useEffect(() => {
    fetchPayments()
    loadDropdownData()
  }, [])

  const isChequeLike = form.mode === 'Cheque' || form.mode === 'DD'
  const isTransfer   = form.mode === 'NEFT' || form.mode === 'RTGS'

  const isEditChequeLike = editForm.mode === 'Cheque' || editForm.mode === 'DD'
  const isEditTransfer   = editForm.mode === 'NEFT' || editForm.mode === 'RTGS'

  const evalPolicyStatus = (validToDateStr: string): 'Active' | 'Expiring' | 'Expired' => {
    if (!validToDateStr) return 'Active'
    const today = new Date(SYSTEM_ANCHOR_DATE)
    const policyExpiry = new Date(validToDateStr)
    const limitBoundary = new Date(today)
    limitBoundary.setDate(limitBoundary.getDate() + 7) 
    const expiryISO = policyExpiry.toISOString().slice(0, 10)
    
    if (expiryISO < SYSTEM_ANCHOR_DATE) return 'Expired'
    if (expiryISO >= SYSTEM_ANCHOR_DATE && policyExpiry <= limitBoundary) return 'Expiring'
    return 'Active'
  }

  const imminentRiskCount = useMemo(() => {
    return rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Expiring').length
  }, [rows])

  const processedLedgerRows = useMemo(() => {
    return rows.filter((r) => {
      if (r.is_deleted) return false 
      if (search) {
        const query = search.toLowerCase()
        if (
          !(r.file_number || '').toLowerCase().includes(query) &&
          !(r.payee_name || r.insurance_company_name || '').toLowerCase().includes(query) &&
          !(r.remarks || '').toLowerCase().includes(query)
        ) return false
      }
      if (filterStatus && evalPolicyStatus(r.valid_to) !== filterStatus) return false
      if (filterMode && r.mode !== filterMode) return false
      if (filterDateFrom && r.payment_date < filterDateFrom) return false
      if (filterDateTo && r.payment_date > filterDateTo) return false
      return true
    })
  }, [rows, search, filterStatus, filterMode, filterDateFrom, filterDateTo])

  const totalPages = Math.max(1, Math.ceil(processedLedgerRows.length / pageSize))
  const safePageIndex = Math.min(page, totalPages)
  const paginatedRows = processedLedgerRows.slice((safePageIndex - 1) * pageSize, safePageIndex * pageSize)

  const totalPremiumsPaid = rows.filter(r => !r.is_deleted).reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const activeCount = rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Active').length
  const expiredCount = rows.filter(r => !r.is_deleted && evalPolicyStatus(r.valid_to) === 'Expired').length

  const buildExportData = (itemsToExport?: any[]) =>
    (itemsToExport || processedLedgerRows).map((r) => ({
      ID: r.id || r.insurance_payment_id || '—',
      'File No.': r.file_number,
      'Insurance Company': r.payee_name || r.insurance_company_name || '—',
      'Amount (₹)': Number(r.amount || 0),
      Mode: r.mode,
      'Payment Date': r.payment_date || '—',
      'Valid Until': r.valid_to || '—',
      'Policy Status': evalPolicyStatus(r.valid_to),
      Remarks: r.remarks ?? '',
    }))

  const handleExportExcel = (itemsToExport?: any[]) => {
    const data = buildExportData(itemsToExport)
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Insurance Payments')
    XLSX.writeFile(wb, `insurance_payments_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const handleExportPDF = (itemsToExport?: any[]) => {
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Insurance Payments Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    const list = itemsToExport || processedLedgerRows
    doc.text(`Generated on: ${today} | Total records: ${list.length}`, 14, 22)
    doc.setTextColor(0)

    const data = buildExportData(itemsToExport)
    autoTable(doc, {
      startY: 28,
      head: [['ID', 'File No.', 'Insurance Company', 'Amount (₹)', 'Mode', 'Payment Date', 'Valid Until', 'Policy Status']],
      body: data.map((r) => [
        r.ID.startsWith('temp') ? '—' : r.ID.slice(0, 8),
        r['File No.'] || '—',
        r['Insurance Company'],
        '₹' + r['Amount (₹)'].toLocaleString('en-IN'),
        r.Mode,
        r['Payment Date'],
        r['Valid Until'],
        r['Policy Status'].toUpperCase(),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`insurance_payments_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const validateFormPayload = (isEdit: boolean = false) => {
    const errCollection: Record<string, string> = {}
    const currentForm = isEdit ? editForm : form;

    if (!currentForm.file_id.trim()) errCollection.file_id = 'File registration index required.'
    if (!currentForm.insurance_company_id.trim()) errCollection.insurance_company_id = 'Insurance provider is required.'
    if (!currentForm.amount || Number(currentForm.amount) <= 0) errCollection.amount = 'Valid transaction premium costing metric mandatory.'
    if (!currentForm.valid_to) errCollection.valid_to = 'Plan protection duration limit boundary target required.'
    
    const isCheque = currentForm.mode === 'Cheque' || currentForm.mode === 'DD'
    const isTx = currentForm.mode === 'NEFT' || currentForm.mode === 'RTGS'

    if (isCheque && !currentForm.cheque_no) errCollection.cheque_no = 'Cheque / DD number required'
    if (isTx && !currentForm.utr_no) errCollection.utr_no = 'UTR / reference number required'

    setErrors(errCollection)
    return Object.keys(errCollection).length === 0
  }

  const isValidUUID = (str: string) => 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

  const dispatchInsertionMutation = async () => {
    if (!validateFormPayload(false)) return
    
    const payload = {
      file_id: form.file_id,
      payment_date: form.payment_date,
      payment_mode: form.mode.toLowerCase(),
      amount: parseFloat(form.amount),
      insurance_company_id: form.insurance_company_id,
      valid_to: form.valid_to || null,
      company_bank_id: form.company_bank_id && isValidUUID(form.company_bank_id) ? form.company_bank_id : null,
      cheque_bank_name: form.cheque_bank_name.trim() || null,
      branch_name: form.branch_name.trim() || null,
      cheque_no: form.cheque_no.trim() || null,
      cheque_date: form.cheque_date ? form.cheque_date : null, 
      utr_no: form.utr_no.trim() || null,
      remarks: form.remarks.trim() || null
    }

    try {
      await insurancePaymentsApi.create(payload)
      setShowAdd(false)
      setForm({ 
        file_id: '', insurance_company_id: '', amount: '', mode: 'UPI', 
        payment_date: SYSTEM_ANCHOR_DATE, valid_to: '', 
        company_bank_id: '', cheque_bank_name: '', branch_name: '', 
        cheque_no: '', cheque_date: '', utr_no: '', remarks: '' 
      })
      fetchPayments() 
      message.success("Insurance payment recorded successfully!")
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail 
        ? (Array.isArray(error.response.data.detail) ? error.response.data.detail[0].msg : error.response.data.detail)
        : "Failed to save the record.";
      message.error(errorMsg)
    }
  }

  const dispatchUpdateMutation = async () => {
    if (!validateFormPayload(true)) return

    const payload = {
      payment_date: editForm.payment_date,
      payment_mode: editForm.mode.toLowerCase(),
      amount: parseFloat(editForm.amount),
      insurance_company_id: editForm.insurance_company_id,
      valid_to: editForm.valid_to || null,
      company_bank_id: editForm.company_bank_id && isValidUUID(editForm.company_bank_id) ? editForm.company_bank_id : null,
      cheque_bank_name: editForm.cheque_bank_name.trim() || null,
      branch_name: editForm.branch_name.trim() || null,
      cheque_no: editForm.cheque_no.trim() || null,
      cheque_date: editForm.cheque_date ? editForm.cheque_date : null,
      utr_no: editForm.utr_no.trim() || null,
      remarks: editForm.remarks.trim() || null
    }

    try {
      await insurancePaymentsApi.update(editRow.id || editRow.insurance_payment_id, payload)
      setEditRow(null)
      fetchPayments()
      message.success("Insurance payment updated successfully!")
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail 
        ? (Array.isArray(error.response.data.detail) ? error.response.data.detail[0].msg : error.response.data.detail)
        : "Failed to update the record.";
      message.error(errorMsg)
    }
  }

  const openEdit = (r: any) => {
    setEditRow(r)
    setEditForm({
      file_id: r.file_id || '',
      insurance_company_id: r.insurance_company_id || '',
      amount: String(r.amount || ''),
      mode: r.mode || r.payment_mode || 'UPI',
      payment_date: r.payment_date || SYSTEM_ANCHOR_DATE,
      valid_to: r.valid_to || '',
      company_bank_id: r.company_bank_id || '',
      cheque_bank_name: r.cheque_bank_name || '',
      branch_name: r.branch_name || '',
      cheque_no: r.cheque_no || '',
      cheque_date: r.cheque_date || '',
      utr_no: r.utr_no || '',
      remarks: r.remarks || ''
    })
    setErrors({})
  }

  const dispatchSoftDeletionMutation = async (targetId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (window.confirm("Perform irreversible system ledger soft-deletion?")) {
      await insurancePaymentsApi.delete(targetId)
      fetchPayments() 
      message.info("Record soft-deleted.")
    }
  }

  return (
    <>
      <PageHeader title="Insurance Payments" subtitle="Insurance premium payments and system coverage mapping" />

      {imminentRiskCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fffbeb', border: '1px solid #fef3c7', color: '#b45309', padding: '14px 18px', borderRadius: 8, marginBottom: 20 }}>
          <ShieldAlert size={20} style={{ color: '#d97706' }} />
          <div style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>
            Attention System Admin: <strong>{imminentRiskCount} policy asset plans</strong> are crossing the critical 7-day contract expiry threshold parameter.
          </div>
          <button className="btn btn-outline btn-sm" style={{ borderColor: '#f59e0b', color: '#b45309', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => setFilterStatus('Expiring')}>
            Isolate Expiring
          </button>
        </div>
      )}

      {/* ── KPI Metric Container Grid Blocks ── */}
      <div className="pay-kpi-row">
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon blue"><IndianRupee size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Total Premiums Paid</div>
            <div className="pay-kpi-value" style={{ color: 'var(--brand-700)' }}>₹{totalPremiumsPaid.toLocaleString('en-IN')}</div>
            <div className="pay-kpi-sub">{rows.filter(r => !r.is_deleted).length} ledger objects loaded</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon green"><CalendarClock size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Active Protected Files</div>
            <div className="pay-kpi-value" style={{ color: '#137333' }}>{activeCount}</div>
            <div className="pay-kpi-sub">Assets current and compliant</div>
          </div>
        </div>
        <div className="pay-kpi-card">
          <div className="pay-kpi-icon red"><AlertTriangle size={20} /></div>
          <div className="pay-kpi-body">
            <div className="pay-kpi-label">Lapsed / Expired Policies</div>
            <div className="pay-kpi-value" style={{ color: '#b91c1c' }}>{expiredCount}</div>
            <div className="pay-kpi-sub">Requires immediate administrative lookup</div>
          </div>
        </div>
      </div>

      {/* ── Filter Matrix Component Form Panel ── */}
      <div className="pay-filter-row">
        <div className="pay-filter-group grow">
          <span className="pay-filter-label">Search</span>
          <input className="pay-filter-input" placeholder="File no., insurer profile identity, metadata..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Policy Status</span>
          <select className="pay-filter-input" value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}>
            <option value="">All statuses</option>
            <option value="Active">Active Plan</option>
            <option value="Expiring">Expiring (≤ 7 Days)</option>
            <option value="Expired">Expired / Lapsed</option>
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Payment Mode</span>
          <select className="pay-filter-input" value={filterMode} onChange={(e) => { setFilterMode(e.target.value); setPage(1) }}>
            <option value="">All channels</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date From</span>
          <input type="date" className="pay-filter-input" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="pay-filter-group">
          <span className="pay-filter-label">Date To</span>
          <input type="date" className="pay-filter-input" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }} />
        </div>
        {(search || filterStatus || filterMode || filterDateFrom || filterDateTo) && (
          <button className="pay-filter-reset" onClick={() => { setSearch(''); setFilterStatus(''); setFilterMode(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(1); }}>
            <RotateCcw size={13} style={{ marginRight: 4 }} />Reset
          </button>
        )}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => { setExportMode('excel'); setExportModalOpen(true); }}
          style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'var(--surface-1)'
            b.style.borderColor = 'var(--gray-300)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = '#fff'
            b.style.borderColor = 'var(--gray-200)'
          }}>
          <FileSpreadsheet size={14} />
          Export Excel
        </button>

        <button
          className="btn btn-outline btn-sm"
          onClick={() => { setExportMode('pdf'); setExportModalOpen(true); }}
          style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: '#fff', color: 'var(--gray-700)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'var(--surface-1)'
            b.style.borderColor = 'var(--gray-300)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = '#fff'
            b.style.borderColor = 'var(--gray-200)'
          }}>
          <FileDown size={14} />
          Export PDF
        </button>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add new
          </button>
        )}
      </div>

      {/* ── Main Structured Ledger Layout View ── */}
      <div className="data-card">
        {processedLedgerRows.length === 0 ? (
          <div className="data-empty">No tracking records hit the configured pipeline parameters.</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>FILE REFERENCE</th>
                    <th>INSURANCE PAYEE VENDOR</th>
                    <th>AMOUNT DISBURSED</th>
                    <th>POLICY STATUS</th> 
                    <th>MODE</th>
                    <th>PAYMENT DATE</th>
                    <th>VALID UNTIL</th>
                    <th style={{ textAlign: 'right' }}>ACTION CONTROL</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((r, i) => {
                    const status = evalPolicyStatus(r.valid_to)
                    // Safe ID Fallback
                    const safeId = r.id || r.insurance_payment_id || `temp-${i}`;
                    
                    return (
                      <tr key={safeId}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--gray-400)', fontSize: '0.82rem' }}>
                          {safeId.startsWith('temp') ? '—' : safeId.slice(0, 8)}
                        </td>
                        <td><span className="db-file-id">{r.file_number}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--gray-800)' }}>{r.payee_name || r.insurance_company_name || '—'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--gray-900)' }}>₹{Number(r.amount || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`from-badge ${status === 'Active' ? 'from-dealer' : status === 'Expiring' ? 'from-broker' : 'from-other'}`} style={{ fontWeight: 600 }}>
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td><span className="mode-badge mode-upi">{r.mode}</span></td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--gray-600)' }}>{r.payment_date}</td>
                        <td style={{ fontSize: '0.84rem', color: 'var(--gray-600)', fontWeight: 500 }}>{r.valid_to}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }} onClick={() => setViewRow(r)}>
                              <Eye size={13} />
                            </button>
                            {isAdmin && (
                              <>
                                <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }} onClick={() => openEdit(r)}>
                                  <Pencil size={13} />
                                </button>
                                <button className="btn btn-outline btn-sm" style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#ef4444' }} onClick={(e) => { if(r.id) dispatchSoftDeletionMutation(r.id, e) }}>
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>            

            <div className="pagination-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="pagination-info">Showing {Math.min((safePageIndex - 1) * pageSize + 1, processedLedgerRows.length)}–{Math.min(safePageIndex * pageSize, processedLedgerRows.length)} of {processedLedgerRows.length} records</span>
                <select className="page-size-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
                </select>
              </div>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => setPage(1)} disabled={safePageIndex === 1}><ChevronsLeft size={14} /></button>
                <button className="page-btn" onClick={() => setPage(safePageIndex - 1)} disabled={safePageIndex === 1}><ChevronLeft size={14} /></button>
                <button className="page-btn active">{safePageIndex}</button>
                <button className="page-btn" onClick={() => setPage(safePageIndex + 1)} disabled={safePageIndex === totalPages}><ChevronRight size={14} /></button>
                <button className="page-btn" onClick={() => setPage(totalPages)} disabled={safePageIndex === totalPages}><ChevronsRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Transaction Inward Entry Overlay Modal ── */}
      {showAdd && (
        <div className="modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Premium Insurance Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAdd(false)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); dispatchInsertionMutation(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Coverage File & Provider Info</div>
                  
                  <div className="form-group">
                    <label className="form-label">File Reference <span style={{ color: 'red' }}>*</span></label>
                    <select className={`form-input ${errors.file_id ? 'error' : ''}`} value={form.file_id} onChange={(e) => setForm({...form, file_id: e.target.value})}>
                      <option value="">Select active file...</option>
                      {files.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.file_number} - {f.customer || 'Unknown'}</option>
                      ))}
                    </select>
                    {errors.file_id && <span className="form-error">{errors.file_id}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Insurer Provider Corporation <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className={`form-input ${errors.insurance_company_id ? 'error' : ''}`} 
                      value={form.insurance_company_id} 
                      onChange={(e) => setForm({...form, insurance_company_id: e.target.value})}
                    >
                      <option value="">Select Insurer Provider...</option>
                      {insuranceCompanies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                    {errors.insurance_company_id && <span className="form-error">{errors.insurance_company_id}</span>}
                  </div>

                  <div className="modal-section-label">Financial Parameters</div>

                  <div className="form-group">
                    <label className="form-label">Premium Amount (₹) <span style={{ color: 'red' }}>*</span></label>
                    <input type="number" className={`form-input ${errors.amount ? 'error' : ''}`} placeholder="e.g. 9500" value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})} />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Transaction Mode <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-input" value={form.mode} onChange={(e) => setForm({...form, mode: e.target.value as any})}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Remittance Corporate Bank Account</label>
                    <select className="form-input" value={form.company_bank_id} onChange={(e) => setForm({...form, company_bank_id: e.target.value})}>
                      <option value="">— Select processing account —</option>
                      {companyBanks.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                    </select>
                  </div>

                  {isChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {form.mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'red' }}>*</span></label>
                        <input
                          className={`form-input ${errors.cheque_no ? 'error' : ''}`}
                          placeholder="e.g. CHQ001234"
                          value={form.cheque_no}
                          onChange={(e) => setForm({...form, cheque_no: e.target.value})}
                        />
                        {errors.cheque_no && <span className="form-error">{errors.cheque_no}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cheque Date</label>
                        <input
                          type="date" className="form-input"
                          value={form.cheque_date}
                          onChange={(e) => setForm({...form, cheque_date: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. SBI"
                          value={form.cheque_bank_name}
                          onChange={(e) => setForm({...form, cheque_bank_name: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Shivaji Nagar"
                          value={form.branch_name}
                          onChange={(e) => setForm({...form, branch_name: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  {isTransfer && (
                    <>
                      <div className="modal-section-label">Transfer Details</div>
                      <div className="form-group modal-full">
                        <label className="form-label">UTR / Reference No. <span style={{ color: 'red' }}>*</span></label>
                        <input
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. NFT202510220089"
                          value={form.utr_no}
                          onChange={(e) => setForm({...form, utr_no: e.target.value})}
                        />
                        {errors.utr_no && <span className="form-error">{errors.utr_no}</span>}
                      </div>
                    </>
                  )}

                  <div className="modal-section-label">Coverage Duration Lifecycle</div>

                  <div className="form-group">
                    <label className="form-label">Premium Payment Booked Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-input" value={form.payment_date} onChange={(e) => setForm({...form, payment_date: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Policy Expiration Target (Valid Until) <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className={`form-input ${errors.valid_to ? 'error' : ''}`} value={form.valid_to} onChange={(e) => setForm({...form, valid_to: e.target.value})} />
                    {errors.valid_to && <span className="form-error">{errors.valid_to}</span>}
                  </div>

                  <div className="modal-section-label">Metadata Records</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Internal Audit Notes / Remarks</label>
                    <textarea className="form-input" rows={2} placeholder="Add policy numbers or specific registration markers..." value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})} />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Insurance Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Edit Modal ── */}
      {editRow && (
        <div className="modal-backdrop" onClick={() => setEditRow(null)}>
          <div className="modal" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Insurance Payment</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditRow(null)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); dispatchUpdateMutation(); }}>
              <div className="modal-body">
                <div className="modal-grid-2">
                  
                  <div className="modal-section-label">Coverage File & Provider Info</div>
                  
                  <div className="form-group">
                    <label className="form-label">File Reference <span style={{ color: 'red' }}>*</span></label>
                    <select className={`form-input ${errors.file_id ? 'error' : ''}`} value={editForm.file_id} disabled>
                      <option value="">Select active file...</option>
                      {files.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.file_number} - {f.customer || 'Unknown'}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>File reference cannot be changed after creation.</span>
                    {errors.file_id && <span className="form-error">{errors.file_id}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Insurer Provider Corporation <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      className={`form-input ${errors.insurance_company_id ? 'error' : ''}`} 
                      value={editForm.insurance_company_id} 
                      onChange={(e) => setEditForm({...editForm, insurance_company_id: e.target.value})}
                    >
                      <option value="">Select Insurer Provider...</option>
                      {insuranceCompanies.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                    {errors.insurance_company_id && <span className="form-error">{errors.insurance_company_id}</span>}
                  </div>

                  <div className="modal-section-label">Financial Parameters</div>

                  <div className="form-group">
                    <label className="form-label">Premium Amount (₹) <span style={{ color: 'red' }}>*</span></label>
                    <input type="number" className={`form-input ${errors.amount ? 'error' : ''}`} placeholder="e.g. 9500" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} />
                    {errors.amount && <span className="form-error">{errors.amount}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Transaction Mode <span style={{ color: 'red' }}>*</span></label>
                    <select className="form-input" value={editForm.mode} onChange={(e) => setEditForm({...editForm, mode: e.target.value as any})}>
                      {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="form-group modal-full">
                    <label className="form-label">Remittance Corporate Bank Account</label>
                    <select className="form-input" value={editForm.company_bank_id} onChange={(e) => setEditForm({...editForm, company_bank_id: e.target.value})}>
                      <option value="">— Select processing account —</option>
                      {companyBanks.map((b: any) => <option key={b.id} value={b.id}>{b.bank_name} - {b.account_number}</option>)}
                    </select>
                  </div>

                  {isEditChequeLike && (
                    <>
                      <div className="modal-section-label">
                        {editForm.mode === 'DD' ? 'Demand Draft Details' : 'Cheque Details'}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cheque / DD No. <span style={{ color: 'red' }}>*</span></label>
                        <input
                          className={`form-input ${errors.cheque_no ? 'error' : ''}`}
                          placeholder="e.g. CHQ001234"
                          value={editForm.cheque_no}
                          onChange={(e) => setEditForm({...editForm, cheque_no: e.target.value})}
                        />
                        {errors.cheque_no && <span className="form-error">{errors.cheque_no}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Cheque Date</label>
                        <input
                          type="date" className="form-input"
                          value={editForm.cheque_date}
                          onChange={(e) => setEditForm({...editForm, cheque_date: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Bank Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. SBI"
                          value={editForm.cheque_bank_name}
                          onChange={(e) => setEditForm({...editForm, cheque_bank_name: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Branch Name</label>
                        <input
                          className="form-input"
                          placeholder="e.g. Shivaji Nagar"
                          value={editForm.branch_name}
                          onChange={(e) => setEditForm({...editForm, branch_name: e.target.value})}
                        />
                      </div>
                    </>
                  )}

                  {isEditTransfer && (
                    <>
                      <div className="modal-section-label">Transfer Details</div>
                      <div className="form-group modal-full">
                        <label className="form-label">UTR / Reference No. <span style={{ color: 'red' }}>*</span></label>
                        <input
                          className={`form-input ${errors.utr_no ? 'error' : ''}`}
                          placeholder="e.g. NFT202510220089"
                          value={editForm.utr_no}
                          onChange={(e) => setEditForm({...editForm, utr_no: e.target.value})}
                        />
                        {errors.utr_no && <span className="form-error">{errors.utr_no}</span>}
                      </div>
                    </>
                  )}

                  <div className="modal-section-label">Coverage Duration Lifecycle</div>

                  <div className="form-group">
                    <label className="form-label">Premium Payment Booked Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-input" value={editForm.payment_date} onChange={(e) => setEditForm({...editForm, payment_date: e.target.value})} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Policy Expiration Target (Valid Until) <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className={`form-input ${errors.valid_to ? 'error' : ''}`} value={editForm.valid_to} onChange={(e) => setEditForm({...editForm, valid_to: e.target.value})} />
                    {errors.valid_to && <span className="form-error">{errors.valid_to}</span>}
                  </div>

                  <div className="modal-section-label">Metadata Records</div>
                  <div className="form-group modal-full">
                    <label className="form-label">Internal Audit Notes / Remarks</label>
                    <textarea className="form-input" rows={2} placeholder="Add policy numbers or specific registration markers..." value={editForm.remarks} onChange={(e) => setEditForm({...editForm, remarks: e.target.value})} />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditRow(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Update Insurance Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inspection Detail Inspection Modal Drawer ── */}
      {viewRow && (
        <div className="modal-backdrop" onClick={() => setViewRow(null)}>
          <div className="modal" style={{ maxWidth: 550 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Insurance Plan Audit Ledger — {(viewRow.id || viewRow.insurance_payment_id || '').slice(0, 8)}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewRow(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="pay-detail-grid">
                <div className="pay-detail-item">
                  <div className="pay-detail-key">File Reference Number</div>
                  <div className="pay-detail-val"><span className="db-file-id">{viewRow.file_number}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Calculated Policy Status</div>
                  <div className="pay-detail-val">
                    <span className={`from-badge ${evalPolicyStatus(viewRow.valid_to) === 'Active' ? 'from-dealer' : evalPolicyStatus(viewRow.valid_to) === 'Expiring' ? 'from-broker' : 'from-other'}`}>
                      {evalPolicyStatus(viewRow.valid_to).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Insurance Provider Carrier</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>{viewRow.payee_name || viewRow.insurance_company_name || '—'}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Premium Cost Value</div>
                  <div className="pay-detail-val" style={{ fontWeight: 600 }}>₹{Number(viewRow.amount || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Transaction Channel</div>
                  <div className="pay-detail-val"><span className="mode-badge mode-upi">{viewRow.mode}</span></div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Payment Finalized Date</div>
                  <div className="pay-detail-val">{viewRow.payment_date}</div>
                </div>
                <div className="pay-detail-item">
                  <div className="pay-detail-key">Coverage Expiration Date</div>
                  <div className="pay-detail-val" style={{ fontWeight: 500 }}>{viewRow.valid_to}</div>
                </div>
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Linked Ledger Settlement Bank</div>
                  <div className="pay-detail-val">
                    {companyBanks.find(b => b.id === viewRow.company_bank_id)?.bank_name || '—'}
                  </div>
                </div>
                {viewRow.cheque_no && (
                  <>
                    <div className="pay-detail-item">
                      <div className="pay-detail-key">Cheque/DD No.</div>
                      <div className="pay-detail-val">{viewRow.cheque_no}</div>
                    </div>
                    <div className="pay-detail-item">
                      <div className="pay-detail-key">Cheque Date</div>
                      <div className="pay-detail-val">{viewRow.cheque_date || '—'}</div>
                    </div>
                    <div className="pay-detail-item">
                      <div className="pay-detail-key">Bank Name</div>
                      <div className="pay-detail-val">{viewRow.cheque_bank_name || '—'}</div>
                    </div>
                    <div className="pay-detail-item">
                      <div className="pay-detail-key">Branch Name</div>
                      <div className="pay-detail-val">{viewRow.branch_name || '—'}</div>
                    </div>
                  </>
                )}
                {viewRow.utr_no && (
                  <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="pay-detail-key">UTR / Reference No.</div>
                    <div className="pay-detail-val">{viewRow.utr_no}</div>
                  </div>
                )}
                <div className="pay-detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="pay-detail-key">Audit Remarks</div>
                  <div className="pay-detail-val">{viewRow.remarks || '—'}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setViewRow(null)}>Close Inspection</button>
            </div>
          </div>
        </div>
      )}

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select Insurance Payments to Export"
        rows={processedLedgerRows}
        getRecordName={(r) => `${r.payee_name || r.insurance_company_name || '—'} (File: ${r.file_number || '—'})`}
        getRecordIdentifier={(r) => r.id || r.insurance_payment_id || ''}
        mode={exportMode}
        onExportExcel={handleExportExcel}
        onExportTable={handleExportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `insurance_payments_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'Payment ID', value: r.id || r.insurance_payment_id || '—' },
              { label: 'File Number', value: r.file_number || '—' },
              { label: 'Insurance Company', value: r.payee_name || r.insurance_company_name || '—' },
              { label: 'Premium Amount', value: '₹' + Number(r.amount || 0).toLocaleString('en-IN') },
              { label: 'Payment Mode', value: r.mode },
              { label: 'Payment Date', value: r.payment_date || '—' },
              { label: 'Policy Expiry (Valid To)', value: r.valid_to || '—' },
              { label: 'Policy Status', value: evalPolicyStatus(r.valid_to).toUpperCase() },
              { label: 'Company Bank Account', value: companyBanks.find(b => b.id === r.company_bank_id)?.bank_name || '—' },
              { label: 'Cheque/DD No.', value: r.cheque_no || '—' },
              { label: 'Cheque/DD Date', value: r.cheque_date || '—' },
              { label: 'Cheque Bank Name', value: r.cheque_bank_name || '—' },
              { label: 'Branch Name', value: r.branch_name || '—' },
              { label: 'UTR / Reference No.', value: r.utr_no || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `insurance_${r.file_number || 'file'}_${r.payee_name || r.insurance_company_name || ''}`,
            'Insurance Payment Voucher',
            'Voucher'
          )
        }}
      />
    </>
  )
}