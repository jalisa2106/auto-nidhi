import { useState, useEffect, useCallback } from 'react'
import {
  X, Search, Plus, FileText, Banknote, Calendar, CreditCard, Eye,
  Pencil, Trash2, Landmark, Building2, Hash, AlignLeft,
  FileSpreadsheet, FileDown, Users, TrendingUp
} from 'lucide-react'
import Pagination from '../../components/app/Pagination'
import Modal from '../../components/app/Modal'
import { mockDealers, mockBrokers } from '../../lib/mockData'
import { rtoPaymentsApi, filesApi, dealersApi, brokersApi } from '../../api/services'
import { message } from 'antd'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SelectiveExportModal } from '../../components/app/SelectiveExportModal'
import { exportDetailPDFsAsZip } from '../../utils/zipExportUtils'
import FileDetailDrawer from '../../components/app/FileDetailDrawer'

interface RTOPayment {
  id               : string
  payment_date     : string
  payment_mode     : 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'
  amount           : number
  bank_account_no  : string
  ifsc_code        : string
  cheque_bank_name : string
  branch_name      : string
  cheque_no        : string
  cheque_date      : string
  cheque_amount    : number
  utr_no           : string
  remarks          : string
  file_number      : string
  payee_dealer_id  : string
  payee_broker_id  : string
  payee_dealer_name: string
  payee_broker_name: string
}

type PaymentMode = RTOPayment['payment_mode']
const MODES: PaymentMode[] = ['cash','cheque','rtgs','neft','imps','upi']

const emptyForm = (): Omit<RTOPayment, 'id'> => ({
  payment_date:'', payment_mode:'cash', amount:0,
  bank_account_no:'', ifsc_code:'', cheque_bank_name:'', branch_name:'',
  cheque_no:'', cheque_date:'', cheque_amount:0, utr_no:'', remarks:'',
  file_number:'', payee_dealer_id:'', payee_broker_id:'', payee_dealer_name:'', payee_broker_name:'',
})

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

const modeBadge: Record<PaymentMode, { bg: string; color: string }> = {
  cash  : { bg:'#dcfce7', color:'#15803d' },
  cheque: { bg:'#fef3c7', color:'#92400e' },
  rtgs  : { bg:'#ede9fe', color:'#6d28d9' },
  neft  : { bg:'#dbeafe', color:'#1d4ed8' },
  imps  : { bg:'#fce7f3', color:'#9d174d' },
  upi   : { bg:'#f0fdf4', color:'#166534' },
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatPaymentId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `RTO-${id.slice(0,8)}`
  return id
}

interface PageProps {
  forceRole?: string
  forceAdmin?: boolean
}

// ── Pagination ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, iconBg, iconColor, accent }: {
  icon: React.ReactNode; label: string; value: string | number
  iconBg: string; iconColor: string; accent?: string
}) {
  return (
    <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', padding:'18px 20px', boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:14, transition:'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow='var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(0)';    (e.currentTarget as HTMLDivElement).style.boxShadow='var(--shadow-sm)' }}>
      <div style={{ width:44, height:44, borderRadius:'var(--radius-sm)', background:iconBg, color:iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:'.75rem', color:'var(--gray-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
        <div style={{ fontSize:'1.6rem', fontWeight:800, color:accent||'var(--gray-900)', lineHeight:1.1, marginTop:2 }}>{value}</div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 0', borderBottom:'1px solid var(--gray-100)' }}>
      <div style={{ color:'var(--brand-500)', marginTop:1, flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:'.72rem', color:'var(--gray-400)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
        <div style={{ fontSize:'.9rem', color:'var(--gray-800)', fontWeight:500, marginTop:2 }}>{value}</div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

export default function RTOPaymentsPage({ forceRole, forceAdmin }: PageProps = {}) {
  const role = forceRole ?? (localStorage.getItem('user_role') || 'admin')
  const isAdmin = forceAdmin ?? role === 'admin'

  const [rows,     setRows]     = useState<RTOPayment[]>([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<RTOPayment | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form,     setForm]     = useState<Omit<RTOPayment,'id'>>(emptyForm())
  const [filesList, setFilesList] = useState<any[]>([])
  const [dealersList, setDealersList] = useState<any[]>([])
  const [brokersList, setBrokersList] = useState<any[]>([])

  // Modal / Pagination states
  const [viewOpen, setViewOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const closeView = useCallback(() => { setViewOpen(false); setSelected(null) }, [])
  const [drawerFileId, setDrawerFileId] = useState<string | null>(null)

  const getPayeeName = useCallback((r: RTOPayment) => {
    if (r.payee_dealer_id) {
      const d = dealersList.find(x => x.id === r.payee_dealer_id) || mockDealers.find(x => x.id === r.payee_dealer_id)
      return d ? (d.dealer_name || d.name) : (r.payee_dealer_name || '—')
    }
    if (r.payee_broker_id) {
      const b = brokersList.find(x => x.id === r.payee_broker_id) || mockBrokers.find(x => x.id === r.payee_broker_id)
      return b ? (b.broker_name || b.name) : (r.payee_broker_name || '—')
    }
    return r.payee_dealer_name || r.payee_broker_name || '—'
  }, [dealersList, brokersList])

  const getPayeeType = useCallback((r: RTOPayment) => {
    if (r.payee_dealer_id || r.payee_dealer_name) return 'Dealer'
    if (r.payee_broker_id || r.payee_broker_name) return 'Broker'
    return '—'
  }, [])

  useEffect(() => {
    fetchRTOPayments()
    fetchFiles()
    fetchDealers()
    fetchBrokers()
  }, [])

  // ESC key closes the detail modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeView() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeView])

  const fetchRTOPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await rtoPaymentsApi.list({ page: 1, limit: 100 })
      setRows(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments')
      console.error('Fetch RTO Payments error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchFiles = async () => {
    try {
      const res = await filesApi.list(1, 200)
      setFilesList(res.data || [])
    } catch (err) {
      console.error('Failed to fetch files:', err)
    }
  }

  const fetchDealers = async () => {
    try {
      const res = await dealersApi.list()
      setDealersList(Array.isArray(res) ? res : (res.data || []))
    } catch (err) {
      console.error('Failed to fetch dealers:', err)
    }
  }

  const fetchBrokers = async () => {
    try {
      const res = await brokersApi.list()
      setBrokersList(Array.isArray(res) ? res : (res.data || []))
    } catch (err) {
      console.error('Failed to fetch brokers:', err)
    }
  }

  const isCheque = form.payment_mode === 'cheque'
  const isOnline = ['rtgs', 'neft', 'imps', 'upi'].includes(form.payment_mode)

  const totalAmount  = rows.reduce((s, r) => s + r.amount, 0)
  const uniquePayees = new Set(rows.map(r => getPayeeName(r))).size
  const avgAmount    = rows.length ? Math.round(totalAmount / rows.length) : 0

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return r.id.toLowerCase().includes(q) || r.file_number.toLowerCase().includes(q) || getPayeeName(r).toLowerCase().includes(q) || r.payment_mode.toLowerCase().includes(q)
  })

  // ── Export Excel
  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || filtered
    const data = list.map((r) => ({
      'Payment ID': formatPaymentId(r.id),
      'File No.': r.file_number,
      'Payee Name': getPayeeName(r),
      'Payee Type': getPayeeType(r),
      'Amount': r.amount,
      'Mode': r.payment_mode.toUpperCase(),
      'Date': r.payment_date,
      'UTR / Cheque No.': r.utr_no || r.cheque_no || '',
      'Remarks': r.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'RTO Payments')
    XLSX.writeFile(wb, `rto_payments_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Export PDF
  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || filtered
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('RTO Payments Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['Payment ID', 'File No.', 'Payee Name', 'Payee Type', 'Amount', 'Mode', 'Date', 'Reference'],
      ],
      body: list.map((r) => [
        formatPaymentId(r.id),
        r.file_number,
        getPayeeName(r),
        getPayeeType(r),
        '₹' + r.amount.toLocaleString('en-IN'),
        r.payment_mode.toUpperCase(),
        r.payment_date,
        r.utr_no || r.cheque_no || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`rto_payments_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const handleAdd = async () => {
    if (!filesList.length) {
      setError('Cannot create payment: files not loaded from server. Please ensure backend /api/v1/files is reachable.')
      return
    }

    if (!form.file_number) { setError('Please select a file'); return }
    if (!form.payment_date) { setError('Please select a payment date'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount'); return }
    if (!form.payee_dealer_id && !form.payee_broker_id) { setError('Please select an RTO party (Dealer or Broker)'); return }

    const fileExists = filesList.some(f => String(f.id) === String(form.file_number) || String(f.file_number) === String(form.file_number))
    if (!fileExists) { setError('Selected file is not a valid file from server'); return }

    try {
      setLoading(true)
      setError(null)

      const payload: any = {
        file_id: form.file_number,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: Number(form.amount),
        payee_dealer_id: uuidRe.test(form.payee_dealer_id) ? form.payee_dealer_id : undefined,
        payee_broker_id: uuidRe.test(form.payee_broker_id) ? form.payee_broker_id : undefined,
        bank_account_no: form.bank_account_no || undefined,
        ifsc_code: form.ifsc_code || undefined,
        cheque_bank_name: form.cheque_bank_name || undefined,
        branch_name: form.branch_name || undefined,
        cheque_no: form.cheque_no || undefined,
        cheque_date: form.cheque_date || undefined,
        cheque_amount: form.cheque_amount ? Number(form.cheque_amount) : undefined,
        utr_no: form.utr_no || undefined,
        remarks: form.remarks || undefined,
      }

      const result = await rtoPaymentsApi.create(payload)

      if (result && result.status === 'success') {
        setAddOpen(false)
        setForm(emptyForm())
        message.success("Payment added successfully")
        await fetchRTOPayments()
      } else {
        setError(JSON.stringify(result))
      }
    } catch (err: any) {
      const serverDetail = err?.response?.data || err?.response || err?.message || String(err)
      setError(typeof serverDetail === 'string' ? serverDetail : JSON.stringify(serverDetail))
      console.error('Add RTO Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (r: RTOPayment) => {
    const { id: _id, ...rest } = r
    setForm(rest)
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!form.file_number) { setError('Please select a file'); return }
    if (!form.payment_date) { setError('Please select a payment date'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount'); return }
    if (!form.payee_dealer_id && !form.payee_broker_id) { setError('Please select an RTO party (Dealer or Broker)'); return }

    try {
      setLoading(true)
      
      const payload: any = {
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: Number(form.amount),
        payee_dealer_id: uuidRe.test(form.payee_dealer_id) ? form.payee_dealer_id : null,
        payee_broker_id: uuidRe.test(form.payee_broker_id) ? form.payee_broker_id : null,
        bank_account_no: form.bank_account_no || null,
        ifsc_code: form.ifsc_code || null,
        cheque_bank_name: form.cheque_bank_name || null,
        branch_name: form.branch_name || null,
        cheque_no: form.cheque_no || null,
        cheque_date: form.cheque_date || null,
        cheque_amount: form.cheque_amount ? Number(form.cheque_amount) : null,
        utr_no: form.utr_no || null,
        remarks: form.remarks || null,
      }

      if (!selected) return;

      await rtoPaymentsApi.update(selected.id, payload)
      
      message.success("Payment updated successfully")
      setEditOpen(false)
      setError(null) 
      setForm(emptyForm())
      setSelected(null)
      
      await fetchRTOPayments()
      
    } catch (err: any) {
      const serverDetail = err?.response?.data || err?.message || 'Error updating payment'
      setError(typeof serverDetail === 'string' ? serverDetail : JSON.stringify(serverDetail))
      console.error('Edit RTO Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      
      await rtoPaymentsApi.delete(id) 
      
      setRows(prev => prev.filter(r => r.id !== id))
      setSelected(null)
      setError(null)
      message.success("Payment deleted successfully")
      
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Error deleting payment')
      console.error('Delete RTO Payment error:', err)
      
      await fetchRTOPayments()
    } finally {
      setLoading(false)
    }
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: key === 'amount' || key === 'cheque_amount' ? Number(e.target.value) : e.target.value }))

  const activeDealers = dealersList.length > 0 ? dealersList : mockDealers
  const activeBrokers = brokersList.length > 0 ? brokersList : mockBrokers

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:20 }}>
      
      {error && (
        <div style={{ padding:'12px 16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', color:'#b91c1c', fontSize:'.85rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background:'none', border:'none', color:'#b91c1c', cursor:'pointer', fontSize:'1.2rem' }}>×</button>
        </div>
      )}

      {loading && (
        <div style={{ padding:'12px 16px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'var(--radius-md)', color:'#1d4ed8', fontSize:'.85rem' }}>
          Loading...
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <StatCard icon={<Banknote size={20}/>}    label="Total RTO Payments"      value={fmt(totalAmount)} iconBg="#eff6ff" iconColor="#1d4ed8" accent="#1d4ed8" />
        <StatCard icon={<Users size={20}/>}        label="RTO Parties Worked With" value={uniquePayees}    iconBg="#f0fdf4" iconColor="#15803d" accent="#15803d" />
        <StatCard icon={<TrendingUp size={20}/>}   label="Avg. Payment Per File"   value={fmt(avgAmount)}  iconBg="#fef3c7" iconColor="#92400e" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, minHeight:0, flex:1 }}>

        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--gray-100)', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--gray-900)' }}>
              All RTO Payments
              <span style={{ marginLeft:8, fontSize:'.75rem', color:'var(--gray-400)', fontWeight:500 }}>{filtered.length} records</span>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                <input id="rto-search" placeholder="Search by ID, file, payee…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ padding:'8px 12px 8px 32px', border:'1.5px solid var(--gray-200)', borderRadius:8, fontSize:'.85rem', outline:'none', fontFamily:'inherit', width:220 }}
                  onFocus={e => (e.target.style.borderColor='var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor='var(--gray-200)')} />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => { setExportMode('excel'); setExportModalOpen(true); }}
                  style={{ display:'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-700)', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gray-300)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gray-200)')}>
                  <FileSpreadsheet size={15} /> Export Excel
                </button>
                <button onClick={() => { setExportMode('pdf'); setExportModalOpen(true); }}
                  style={{ display:'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-700)', fontSize: '.84rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gray-300)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gray-200)')}>
                  <FileDown size={15} /> Export PDF
                </button>
              </div>
              {isAdmin && (
                <button id="rto-add-btn" onClick={() => { setForm(emptyForm()); setAddOpen(true) }}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:'var(--radius-sm)', background:'var(--brand-600)', color:'#fff', fontSize:'.85rem', fontWeight:600, cursor:'pointer', border:'none', transition:'background .15s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-700)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-600)')}>
                  <Plus size={15} /> Add Payment
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX:'auto', flex:1 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>
                  {['#','Payment ID','File No.','RTO Party','Amount','Mode','Date','Action'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--gray-500)', background:'var(--surface-1)', borderBottom:'1px solid var(--gray-100)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No payments match your search.</td></tr>
                ) : pageRows.map((row, i) => {
                  const mb = modeBadge[row.payment_mode]
                  return (
                    <tr key={row.id} id={`rto-row-${row.id}`}
                      style={{ borderLeft: '3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background='var(--surface-1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background='transparent' }}>
                      <td style={{ padding:'12px 14px', color:'var(--gray-400)', fontSize:'.8rem' }}>{(safePage - 1) * pageSize + i + 1}</td>
                      <td style={{ padding:'12px 14px', color:'var(--brand-700)', fontWeight:600, fontSize:'.82rem' }} title={row.id}>{formatPaymentId(row.id)}</td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-700)', fontWeight:600, cursor:'pointer' }}
                        title="Click to view file details"
                        onClick={() => {
                          const match = filesList.find(f => f.file_number === row.file_number || f.id === row.file_number)
                          if (match) setDrawerFileId(match.id)
                        }}
                      >{row.file_number}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:600, color:'var(--gray-900)' }}>{getPayeeName(row)}</div>
                        <div style={{ fontSize:'.73rem', color:'var(--gray-400)' }}>{getPayeeType(row)}</div>
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:'var(--gray-900)' }}>{fmt(row.amount)}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:'var(--radius-full)', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', background:mb.bg, color:mb.color }}>{row.payment_mode}</span>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-600)' }}>{row.payment_date}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <button className="btn btn-outline btn-sm" style={{ padding:'5px 12px', fontSize:'.78rem' }} onClick={() => { setSelected(row); setViewOpen(true) }} title="View details"><Eye size={13} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div>

      {/* ── Detail popup modal ── */}
      {viewOpen && selected && (
        <div className="modal-backdrop" onClick={closeView}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>RTO Payment — {formatPaymentId(selected.id)}</h3>
              <button className="btn btn-ghost btn-sm" onClick={closeView}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0 20px', borderBottom:'1px solid var(--gray-100)', marginBottom:16 }}>
                <div style={{ width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg, var(--brand-500), var(--brand-700))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:800, marginBottom:10, boxShadow:'0 4px 12px rgba(37,99,235,.25)' }}>
                  {getPayeeName(selected).slice(0,2).toUpperCase()}
                </div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--gray-900)' }}>{getPayeeName(selected)}</div>
                <div style={{ fontSize:'.8rem', color:'var(--gray-400)', marginTop:2 }}>{getPayeeType(selected)}</div>
                <div style={{ marginTop:12, padding:'8px 24px', background:'var(--brand-50)', borderRadius:'var(--radius-md)', textAlign:'center' }}>
                  <div style={{ fontSize:'.7rem', color:'var(--brand-600)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Payment Amount</div>
                  <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--brand-700)' }}>{fmt(selected.amount)}</div>
                </div>
                {isAdmin && (
                  <div style={{ display:'flex', gap:8, marginTop:14 }}>
                    <button id={`rto-edit-${selected.id}`} onClick={() => { openEdit(selected); setViewOpen(false) }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--brand-200)', background:'var(--brand-50)', color:'var(--brand-700)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-100)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)')}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button id={`rto-delete-${selected.id}`} onClick={() => { handleDelete(selected.id); closeView() }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid #fee2e2', background:'#fff5f5', color:'#b91c1c', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='#fee2e2')}
                      onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='#fff5f5')}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                <DetailRow icon={<Hash      size={14}/>} label="Payment ID"       value={formatPaymentId(selected.id)} />
                <DetailRow icon={<FileText   size={14}/>} label="File Number"      value={selected.file_number} />
                <DetailRow icon={<Calendar   size={14}/>} label="Payment Date"     value={selected.payment_date} />
                <DetailRow icon={<CreditCard size={14}/>} label="Payment Mode"     value={selected.payment_mode.toUpperCase()} />
                <DetailRow icon={<Banknote   size={14}/>} label="Amount"           value={`₹${selected.amount.toLocaleString('en-IN')}`} />
                <DetailRow icon={<Landmark   size={14}/>} label="Bank Account No." value={selected.bank_account_no} />
                <DetailRow icon={<Building2  size={14}/>} label="IFSC Code"        value={selected.ifsc_code} />
                <DetailRow icon={<Building2  size={14}/>} label="Branch"           value={selected.branch_name} />
                <DetailRow icon={<Building2  size={14}/>} label="Cheque Bank"      value={selected.cheque_bank_name} />
                <DetailRow icon={<Hash       size={14}/>} label="Cheque No."       value={selected.cheque_no} />
                <DetailRow icon={<Calendar   size={14}/>} label="Cheque Date"      value={selected.cheque_date} />
                <DetailRow icon={<Banknote   size={14}/>} label="Cheque Amount"    value={selected.cheque_amount ? `₹${selected.cheque_amount.toLocaleString('en-IN')}` : ''} />
                <DetailRow icon={<Hash       size={14}/>} label="UTR / Ref No."    value={selected.utr_no} />
                <DetailRow icon={<AlignLeft  size={14}/>} label="Remarks"          value={selected.remarks} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      <Modal open={addOpen} title="Add RTO Payment" onClose={() => setAddOpen(false)} onSubmit={handleAdd} submitLabel="Add Payment" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label={<span>File Number <span style={{color: 'red'}}>*</span></span>}>
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))} required>
                <option value="">Select file…</option>
                {filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                ))}
              </select>
            </FormField>
            <FormField label={<span>Payment Date <span style={{color: 'red'}}>*</span></span>}>
              <input className="form-input" type="date" value={form.payment_date} onChange={f('payment_date')} required />
            </FormField>
            <FormField label={<span>Amount (₹) <span style={{color: 'red'}}>*</span></span>}>
              <input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} placeholder="0" required />
            </FormField>
            <FormField label={<span>Payment Mode <span style={{color: 'red'}}>*</span></span>}>
              <select className="form-select" style={{ width:'100%' }} value={form.payment_mode} onChange={f('payment_mode')} required>
                {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </FormField>

            <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'red', fontSize: '.75rem', marginTop: 8, marginBottom: -4 }}>
              (At least one must be selected: Payee Dealer or Payee Broker)
            </div>

            <FormField label="Payee Dealer">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_dealer_id}
                onChange={e => setForm(prev => {
                  const selectedId = e.target.value;
                  const dealerObj = activeDealers.find(d => d.id === selectedId);
                  const dealerName = dealerObj ? (dealerObj.dealer_name || dealerObj.name) : '';
                  return { ...prev, payee_dealer_id: selectedId, payee_broker_id: '', payee_dealer_name: dealerName, payee_broker_name: '' }
                })} required={!form.payee_broker_id}>
                <option value="">None / Select dealer…</option>
                {activeDealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name || d.name} — {d.city}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Broker">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_broker_id}
                onChange={e => setForm(prev => {
                  const selectedId = e.target.value;
                  const brokerObj = activeBrokers.find(b => b.id === selectedId);
                  const brokerName = brokerObj ? (brokerObj.broker_name || brokerObj.name) : '';
                  return { ...prev, payee_broker_id: selectedId, payee_dealer_id: '', payee_broker_name: brokerName, payee_dealer_name: '' }
                })} required={!form.payee_dealer_id}>
                <option value="">None / Select broker…</option>
                {activeBrokers.map(b => <option key={b.id} value={b.id}>{b.broker_name || b.name} — {b.district || b.area || '—'}</option>)}
              </select>
            </FormField>
            
            {isCheque && (
              <>
                <FormField label={<span>Cheque No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} placeholder="Cheque number" required /></FormField>
                <FormField label={<span>Cheque Date <span style={{color: 'red'}}>*</span></span>}><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} required /></FormField>
                <FormField label={<span>Cheque Bank Name <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} placeholder="Bank name" required /></FormField>
                <FormField label={<span>Branch Name <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.branch_name} onChange={f('branch_name')} placeholder="Branch name" required /></FormField>
                <FormField label={<span>Cheque Amount (₹) <span style={{color: 'red'}}>*</span></span>}><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} placeholder="Cheque amount" required /></FormField>
              </>
            )}

            {isOnline && (
              <>
                <FormField label={<span>UTR / Ref No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.utr_no} onChange={f('utr_no')} placeholder="UTR or reference number" required /></FormField>
                <FormField label={<span>Bank Account No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.bank_account_no} onChange={f('bank_account_no')} placeholder="Account number" required /></FormField>
                <FormField label={<span>IFSC Code <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.ifsc_code} onChange={f('ifsc_code')} placeholder="IFSC code" required /></FormField>
              </>
            )}
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>
 
      {/* ── Edit Modal ── */}
      <Modal open={editOpen} title={`Edit Payment — ${selected?.id ? formatPaymentId(selected.id) : ''}`} onClose={() => { setEditOpen(false); setSelected(null) }} onSubmit={handleEdit} submitLabel="Save Changes" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label={<span>File Number <span style={{color: 'red'}}>*</span></span>}>
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))} required>
                <option value="">Select file…</option>
                {filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                ))}
              </select>
            </FormField>
            <FormField label={<span>Payment Date <span style={{color: 'red'}}>*</span></span>}>
              <input className="form-input" type="date" value={form.payment_date} onChange={f('payment_date')} required />
            </FormField>
            <FormField label={<span>Amount (₹) <span style={{color: 'red'}}>*</span></span>}>
              <input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} placeholder="0" required />
            </FormField>
            <FormField label={<span>Payment Mode <span style={{color: 'red'}}>*</span></span>}>
              <select className="form-select" style={{ width:'100%' }} value={form.payment_mode} onChange={f('payment_mode')} required>
                {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </FormField>

            <div style={{ gridColumn: 'span 2', textAlign: 'center', color: 'red', fontSize: '.75rem', marginTop: 8, marginBottom: -4 }}>
              (At least one must be selected: Payee Dealer or Payee Broker)
            </div>

            <FormField label="Payee Dealer">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_dealer_id}
                onChange={e => setForm(prev => {
                  const selectedId = e.target.value;
                  const dealerObj = activeDealers.find(d => d.id === selectedId);
                  const dealerName = dealerObj ? (dealerObj.dealer_name || dealerObj.name) : '';
                  return { ...prev, payee_dealer_id: selectedId, payee_broker_id: '', payee_dealer_name: dealerName, payee_broker_name: '' }
                })} required={!form.payee_broker_id}>
                <option value="">None / Select dealer…</option>
                {activeDealers.map(d => <option key={d.id} value={d.id}>{d.dealer_name || d.name} — {d.city}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Broker">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_broker_id}
                onChange={e => setForm(prev => {
                  const selectedId = e.target.value;
                  const brokerObj = activeBrokers.find(b => b.id === selectedId);
                  const brokerName = brokerObj ? (brokerObj.broker_name || brokerObj.name) : '';
                  return { ...prev, payee_broker_id: selectedId, payee_dealer_id: '', payee_broker_name: brokerName, payee_dealer_name: '' }
                })} required={!form.payee_dealer_id}>
                <option value="">None / Select broker…</option>
                {activeBrokers.map(b => <option key={b.id} value={b.id}>{b.broker_name || b.name} — {b.district || b.area || '—'}</option>)}
              </select>
            </FormField>
            
            {isCheque && (
              <>
                <FormField label={<span>Cheque No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} placeholder="Cheque number" required /></FormField>
                <FormField label={<span>Cheque Date <span style={{color: 'red'}}>*</span></span>}><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} required /></FormField>
                <FormField label={<span>Cheque Bank Name <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} placeholder="Bank name" required /></FormField>
                <FormField label={<span>Branch Name <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.branch_name} onChange={f('branch_name')} placeholder="Branch name" required /></FormField>
                <FormField label={<span>Cheque Amount (₹) <span style={{color: 'red'}}>*</span></span>}><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} placeholder="Cheque amount" required /></FormField>
              </>
            )}

            {isOnline && (
              <>
                <FormField label={<span>UTR / Ref No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.utr_no} onChange={f('utr_no')} placeholder="UTR or reference number" required /></FormField>
                <FormField label={<span>Bank Account No. <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.bank_account_no} onChange={f('bank_account_no')} placeholder="Account number" required /></FormField>
                <FormField label={<span>IFSC Code <span style={{color: 'red'}}>*</span></span>}><input className="form-input" value={form.ifsc_code} onChange={f('ifsc_code')} placeholder="IFSC code" required /></FormField>
              </>
            )}
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select RTO Payments to Export"
        rows={filtered}
        getRecordName={(r) => `${getPayeeName(r)} (${getPayeeType(r)}) — File: ${r.file_number}`}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `rto_payments_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (r) => [
              { label: 'Payment ID', value: formatPaymentId(r.id) },
              { label: 'File Number', value: r.file_number },
              { label: 'Payment Date', value: r.payment_date },
              { label: 'Payment Mode', value: r.payment_mode.toUpperCase() },
              { label: 'Amount', value: `₹${r.amount.toLocaleString('en-IN')}` },
              { label: 'Bank Account No.', value: r.bank_account_no || '—' },
              { label: 'IFSC Code', value: r.ifsc_code || '—' },
              { label: 'Branch', value: r.branch_name || '—' },
              { label: 'Cheque Bank', value: r.cheque_bank_name || '—' },
              { label: 'Cheque No.', value: r.cheque_no || '—' },
              { label: 'Cheque Date', value: r.cheque_date || '—' },
              { label: 'Cheque Amount', value: r.cheque_amount ? `₹${r.cheque_amount.toLocaleString('en-IN')}` : '—' },
              { label: 'UTR / Ref No.', value: r.utr_no || '—' },
              { label: 'Remarks', value: r.remarks || '—' }
            ],
            (r) => `rto_payment_${r.file_number || 'file'}_${getPayeeName(r) || ''}`,
            'RTO Payment Details',
            'Payment'
          );
        }}
      />
      {drawerFileId && <FileDetailDrawer fileId={drawerFileId} onClose={() => setDrawerFileId(null)} />}
    </div>
  )
}
