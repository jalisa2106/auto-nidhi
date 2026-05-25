import { useState, useEffect } from 'react'
import {
  Receipt, X, Search, Plus,
  FileText, Banknote, Calendar, CreditCard,
  Hash, AlignLeft, Building2, Users,
  TrendingUp, Landmark, Pencil, Trash2,
} from 'lucide-react'
import Modal from '../../components/app/Modal'
import { mockFiles } from '../../lib/mockData'
import { rtoPaymentsApi, filesApi } from '../../api/services'

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/rto-payments          → fetch all (JOIN query below)
// POST   /api/rto-payments          → create new record
// PATCH  /api/rto-payments/:id      → update record (BACKEND NEEDED)
// DELETE /api/rto-payments/:id      → soft delete (BACKEND NEEDED)
//
// ⚠️  DATABASE SCHEMA UPDATE REQUIRED:
// The soft delete feature requires adding is_deleted column:
//   ALTER TABLE rto_payment ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
// This column exists in other tables (documents) but not in rto_payment
//
// DB query: SELECT rp.*, f.file_number,
//           d.dealer_name AS payee_dealer_name,
//           b.broker_name AS payee_broker_name
//           FROM rto_payment rp
//           JOIN file_record f        ON f.id = rp.file_id
//           LEFT JOIN master_dealer d ON d.id = rp.payee_dealer_id
//           LEFT JOIN master_broker b ON b.id = rp.payee_broker_id
//
// payment_mode enum: 'cash'|'cheque'|'rtgs'|'neft'|'imps'|'upi'
// ─────────────────────────────────────────────────────────────────────────────

interface RTOPayment {
  id               : string
  payment_date     : string   // rto_payment.payment_date
  payment_mode     : 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'
  amount           : number   // rto_payment.amount
  bank_account_no  : string   // rto_payment.bank_account_no
  ifsc_code        : string   // rto_payment.ifsc_code
  cheque_bank_name : string   // rto_payment.cheque_bank_name
  branch_name      : string   // rto_payment.branch_name
  cheque_no        : string   // rto_payment.cheque_no
  cheque_date      : string   // rto_payment.cheque_date
  cheque_amount    : number   // rto_payment.cheque_amount
  utr_no           : string   // rto_payment.utr_no
  remarks          : string   // rto_payment.remarks
  file_number      : string   // file_record.file_number (joined)
  payee_dealer_name: string   // master_dealer.dealer_name (joined, nullable)
  payee_broker_name: string   // master_broker.broker_name (joined, nullable)
}

type PaymentMode = RTOPayment['payment_mode']
const MODES: PaymentMode[] = ['cash','cheque','rtgs','neft','imps','upi']

const emptyForm = (): Omit<RTOPayment, 'id'> => ({
  payment_date:'', payment_mode:'cash', amount:0,
  bank_account_no:'', ifsc_code:'', cheque_bank_name:'', branch_name:'',
  cheque_no:'', cheque_date:'', cheque_amount:0, utr_no:'', remarks:'',
  file_number:'', payee_dealer_name:'', payee_broker_name:'',
})

const getPayeeName = (r: RTOPayment) => r.payee_dealer_name || r.payee_broker_name || '—'
const getPayeeType = (r: RTOPayment) => r.payee_dealer_name ? 'Dealer' : r.payee_broker_name ? 'Broker' : '—'

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

const mockRTO: RTOPayment[] = [
  { id:'RTO-0001', file_number:'FILE-001', payment_date:'2024-01-10', payment_mode:'cheque', amount:12500, bank_account_no:'1234567890', ifsc_code:'HDFC0001234', cheque_bank_name:'HDFC Bank',  branch_name:'Ahmedabad Main', cheque_no:'CHQ001', cheque_date:'2024-01-08', cheque_amount:12500, utr_no:'',                remarks:'RC transfer for Arjun Mehta',       payee_dealer_name:'Rajesh Motors', payee_broker_name:'' },
  { id:'RTO-0002', file_number:'FILE-003', payment_date:'2024-02-14', payment_mode:'neft',   amount:8200,  bank_account_no:'9876543210', ifsc_code:'SBI00023456',  cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'NEFT20240214001', remarks:'Ownership transfer fee',            payee_dealer_name:'',              payee_broker_name:'Mehul Broker' },
  { id:'RTO-0003', file_number:'FILE-006', payment_date:'2024-02-20', payment_mode:'cash',   amount:5500,  bank_account_no:'',           ifsc_code:'',             cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'',                remarks:'NOC charges paid in cash',          payee_dealer_name:'Soni Auto',     payee_broker_name:'' },
  { id:'RTO-0004', file_number:'FILE-009', payment_date:'2024-03-05', payment_mode:'upi',    amount:3200,  bank_account_no:'',           ifsc_code:'',             cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'UPI2024030500124', remarks:'Fitness certificate renewal',       payee_dealer_name:'',              payee_broker_name:'Patel Broker' },
  { id:'RTO-0005', file_number:'FILE-011', payment_date:'2024-03-18', payment_mode:'rtgs',   amount:22000, bank_account_no:'1122334455', ifsc_code:'ICIC0005678',  cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'RTGS202403180056', remarks:'Hypothecation removal',             payee_dealer_name:'Bhavna Motors', payee_broker_name:'' },
  { id:'RTO-0006', file_number:'FILE-013', payment_date:'2024-04-02', payment_mode:'cheque', amount:9800,  bank_account_no:'5544332211', ifsc_code:'AXIS0009012',  cheque_bank_name:'Axis Bank', branch_name:'Surat Branch',   cheque_no:'CHQ006', cheque_date:'2024-04-01', cheque_amount:9800,  utr_no:'',                remarks:'Form 34 registration',              payee_dealer_name:'Raj Automobiles',payee_broker_name:'' },
  { id:'RTO-0007', file_number:'FILE-015', payment_date:'2024-04-20', payment_mode:'imps',   amount:6400,  bank_account_no:'',           ifsc_code:'',             cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'IMPS20240420789', remarks:'Smart card + RC book',             payee_dealer_name:'',              payee_broker_name:'Desai Broker' },
  { id:'RTO-0008', file_number:'FILE-002', payment_date:'2024-05-07', payment_mode:'cash',   amount:4100,  bank_account_no:'',           ifsc_code:'',             cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'',                remarks:'Duplicate RC charges',              payee_dealer_name:'Soni Auto',     payee_broker_name:'' },
  { id:'RTO-0009', file_number:'FILE-016', payment_date:'2024-05-22', payment_mode:'neft',   amount:11700, bank_account_no:'6677889900', ifsc_code:'PNB00034567',  cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'NEFT20240522334', remarks:'Transfer + permit fees',            payee_dealer_name:'',              payee_broker_name:'Mehul Broker' },
  { id:'RTO-0010', file_number:'FILE-018', payment_date:'2024-06-11', payment_mode:'cheque', amount:17500, bank_account_no:'3344556677', ifsc_code:'HDFC0007654',  cheque_bank_name:'HDFC Bank', branch_name:'Vadodara',       cheque_no:'CHQ010', cheque_date:'2024-06-09', cheque_amount:17500, utr_no:'',                remarks:'Full RC transfer package',          payee_dealer_name:'Bhavna Motors', payee_broker_name:'' },
  { id:'RTO-0011', file_number:'FILE-020', payment_date:'2024-06-28', payment_mode:'upi',    amount:2900,  bank_account_no:'',           ifsc_code:'',             cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'UPI20240628992',  remarks:'NOC and endorsement',              payee_dealer_name:'',              payee_broker_name:'Patel Broker' },
  { id:'RTO-0012', file_number:'FILE-007', payment_date:'2024-07-15', payment_mode:'rtgs',   amount:31000, bank_account_no:'2233445566', ifsc_code:'KOTAK004321',  cheque_bank_name:'',          branch_name:'',               cheque_no:'',       cheque_date:'',           cheque_amount:0,     utr_no:'RTGS20240715221', remarks:'Commercial vehicle permit',         payee_dealer_name:'Rajesh Motors', payee_broker_name:'' },
]

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatPaymentId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `RTO-${id.slice(0,8)}`
  return id
}

// ── Sub-components ────────────────────────────────────────────────────────────
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RTOPaymentsPage() {
  const [rows,     setRows]     = useState<RTOPayment[]>(mockRTO)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<RTOPayment | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Modal states
  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form,     setForm]     = useState<Omit<RTOPayment,'id'>>(emptyForm())
  const [filesList, setFilesList] = useState<any[]>([])

  // ── Fetch data on mount ──
  useEffect(() => {
    fetchRTOPayments()
    fetchFiles()
  }, [])

  const fetchRTOPayments = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await rtoPaymentsApi.list({ page: 1, limit: 100 })
      setRows(result.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments')
      console.error('Fetch RTO Payments error:', err)
      // Fallback to mock data on error
      setRows(mockRTO)
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
      // leave filesList empty so UI falls back to mockFiles
    }
  }

  const isCheque = form.payment_mode === 'cheque'
  const isOnline = ['rtgs', 'neft', 'imps', 'upi'].includes(form.payment_mode)

  // Stats
  const totalAmount  = rows.reduce((s, r) => s + r.amount, 0)
  const uniquePayees = new Set(rows.map(r => getPayeeName(r))).size
  const avgAmount    = rows.length ? Math.round(totalAmount / rows.length) : 0

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return r.id.toLowerCase().includes(q) || r.file_number.toLowerCase().includes(q) || getPayeeName(r).toLowerCase().includes(q) || r.payment_mode.toLowerCase().includes(q)
  })

  // ── Handlers ──
  const handleAdd = async () => {
    // Validate that we have files loaded from server (prevent sending mock file ids)
    if (!filesList.length) {
      setError('Cannot create payment: files not loaded from server. Please ensure backend /api/v1/files is reachable.')
      return
    }

    // Validate basic required fields
    if (!form.file_number) { setError('Please select a file'); return }
    if (!form.payment_date) { setError('Please select a payment date'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount'); return }

    // Ensure selected file exists among loaded files (file_number stores UUID from API)
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

      // Only include payee_dealer_id/payee_broker_id if they look like UUIDs
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (form.payee_dealer_name && uuidRe.test(String(form.payee_dealer_name))) payload.payee_dealer_id = form.payee_dealer_name
      if (form.payee_broker_name && uuidRe.test(String(form.payee_broker_name))) payload.payee_broker_id = form.payee_broker_name

      const result = await rtoPaymentsApi.create(payload)

      // Backend returns { status: 'success', id: '...' } on success
      if (result && result.status === 'success') {
        setAddOpen(false)
        setForm(emptyForm())
        await fetchRTOPayments()
      } else {
        setError(JSON.stringify(result))
      }
    } catch (err: any) {
      // Show detailed server validation errors when available
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
    try {
      setLoading(true)
      const payload = {
        file_id: form.file_number,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: form.amount,
        payee_dealer_id: form.payee_dealer_name ? form.payee_dealer_name : undefined,
        payee_broker_id: form.payee_broker_name ? form.payee_broker_name : undefined,
        bank_account_no: form.bank_account_no,
        ifsc_code: form.ifsc_code,
        cheque_bank_name: form.cheque_bank_name,
        branch_name: form.branch_name,
        cheque_no: form.cheque_no,
        cheque_date: form.cheque_date,
        cheque_amount: form.cheque_amount,
        utr_no: form.utr_no,
        remarks: form.remarks,
      }
      
      // API endpoint would be: PATCH /api/rto-payments/:id
      // For now, using rtoPaymentsApi.create as placeholder - backend should implement PATCH endpoint
      setRows(prev => prev.map(r => r.id === selected!.id ? { ...r, ...form } : r))
      setSelected(prev => prev ? { ...prev, ...form } : prev)
      setEditOpen(false)
      setForm(emptyForm())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating payment')
      console.error('Edit RTO Payment error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setLoading(true)
      // Soft delete - requires is_deleted column in database
      // Check database schema - if column doesn't exist, add:
      // ALTER TABLE rto_payment ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
      
      // API call: PATCH /api/rto-payments/:id  →  body: { is_deleted: true }
      // Temporarily using optimistic delete for UI
      setRows(prev => prev.filter(r => r.id !== id))
      setSelected(null)
      
      // Backend soft delete implementation needed
      // await rtoPaymentsApi.softDelete(id) // This endpoint needs to be implemented
      
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting payment')
      console.error('Delete RTO Payment error:', err)
      // Refresh data on error
      await fetchRTOPayments()
    } finally {
      setLoading(false)
    }
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: key === 'amount' || key === 'cheque_amount' ? Number(e.target.value) : e.target.value }))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:20 }}>
      
      {/* Error notification */}
      {error && (
        <div style={{ padding:'12px 16px', background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', color:'#b91c1c', fontSize:'.85rem', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background:'none', border:'none', color:'#b91c1c', cursor:'pointer', fontSize:'1.2rem' }}>×</button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding:'12px 16px', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'var(--radius-md)', color:'#1d4ed8', fontSize:'.85rem' }}>
          Loading...
        </div>
      )}

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        <StatCard icon={<Banknote size={20}/>}    label="Total RTO Payments"      value={fmt(totalAmount)} iconBg="#eff6ff" iconColor="#1d4ed8" accent="#1d4ed8" />
        <StatCard icon={<Users size={20}/>}        label="RTO Parties Worked With" value={uniquePayees}    iconBg="#f0fdf4" iconColor="#15803d" accent="#15803d" />
        <StatCard icon={<TrendingUp size={20}/>}   label="Avg. Payment Per File"   value={fmt(avgAmount)}  iconBg="#fef3c7" iconColor="#92400e" />
      </div>

      {/* Main area */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, minHeight:0, flex:1 }}>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--gray-100)', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--gray-900)' }}>
              All RTO Payments
              <span style={{ marginLeft:8, fontSize:'.75rem', color:'var(--gray-400)', fontWeight:500 }}>{filtered.length} records</span>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                <input id="rto-search" placeholder="Search by ID, file, payee…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding:'8px 12px 8px 32px', border:'1.5px solid var(--gray-200)', borderRadius:8, fontSize:'.85rem', outline:'none', fontFamily:'inherit', width:220 }}
                  onFocus={e => (e.target.style.borderColor='var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor='var(--gray-200)')} />
              </div>
              <button id="rto-add-btn" onClick={() => { setForm(emptyForm()); setAddOpen(true) }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:'var(--radius-sm)', background:'var(--brand-600)', color:'#fff', fontSize:'.85rem', fontWeight:600, cursor:'pointer', border:'none', transition:'background .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-700)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-600)')}>
                <Plus size={15} /> Add Payment
              </button>
            </div>
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>
                  {['Payment ID','File No.','RTO Party','Amount','Mode','Date'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--gray-500)', background:'var(--surface-1)', borderBottom:'1px solid var(--gray-100)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No payments match your search.</td></tr>
                ) : filtered.map(row => {
                  const isSelected = selected?.id === row.id
                  const mb = modeBadge[row.payment_mode]
                  return (
                    <tr key={row.id} id={`rto-row-${row.id}`} onClick={() => setSelected(isSelected ? null : row)}
                      style={{ cursor:'pointer', background: isSelected ? 'var(--brand-50)' : 'transparent', borderLeft: isSelected ? '3px solid var(--brand-500)' : '3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='var(--surface-1)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='transparent' }}>
                      <td style={{ padding:'12px 14px', color:'var(--brand-700)', fontWeight:600, fontSize:'.82rem' }} title={row.id}>{formatPaymentId(row.id)}</td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-700)', fontWeight:600 }}>{row.file_number}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontWeight:600, color:'var(--gray-900)' }}>{getPayeeName(row)}</div>
                        <div style={{ fontSize:'.73rem', color:'var(--gray-400)' }}>{getPayeeType(row)}</div>
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:'var(--gray-900)' }}>{fmt(row.amount)}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'inline-flex', padding:'3px 9px', borderRadius:'var(--radius-full)', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', background:mb.bg, color:mb.color }}>{row.payment_mode}</span>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-600)' }}>{row.payment_date}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {selected ? (
            <>
              <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg, var(--brand-800), var(--brand-900))' }}>
                <div>
                  <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.6)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Payment Detail</div>
                  <div style={{ fontSize:'1rem', fontWeight:700, color:'#fff', marginTop:2 }} title={selected.id}>{formatPaymentId(selected.id)}</div>
                </div>
                <button id="close-rto-detail" onClick={() => setSelected(null)}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'none' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.25)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.15)')}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding:'18px', display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid var(--gray-100)' }}>
                <div style={{ width:54, height:54, borderRadius:'50%', background:'linear-gradient(135deg, var(--brand-500), var(--brand-700))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:800, marginBottom:10, boxShadow:'0 4px 12px rgba(37,99,235,.25)' }}>
                  {getPayeeName(selected).slice(0,2).toUpperCase()}
                </div>
                <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--gray-900)' }}>{getPayeeName(selected)}</div>
                <div style={{ fontSize:'.8rem', color:'var(--gray-400)', marginTop:2 }}>{getPayeeType(selected)}</div>
                <div style={{ marginTop:12, padding:'8px 20px', background:'var(--brand-50)', borderRadius:'var(--radius-md)', textAlign:'center' }}>
                  <div style={{ fontSize:'.7rem', color:'var(--brand-600)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Payment Amount</div>
                  <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--brand-700)' }}>{fmt(selected.amount)}</div>
                </div>

                {/* Edit & Delete */}
                <div style={{ display:'flex', gap:8, marginTop:14 }}>
                  <button id={`rto-edit-${selected.id}`} onClick={() => openEdit(selected)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--brand-200)', background:'var(--brand-50)', color:'var(--brand-700)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-100)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)')}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button id={`rto-delete-${selected.id}`} onClick={() => handleDelete(selected.id)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid #fee2e2', background:'#fff5f5', color:'#b91c1c', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='#fee2e2')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='#fff5f5')}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              <div style={{ padding:'4px 18px 16px', overflowY:'auto', flex:1 }}>
                <DetailRow icon={<Hash       size={14}/>} label="Payment ID"       value={formatPaymentId(selected.id)} />
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
            </>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'var(--gray-300)' }}>
              <Receipt size={52} strokeWidth={1.2} />
              <div style={{ marginTop:14, fontSize:'.9rem', fontWeight:600, color:'var(--gray-400)' }}>Select a payment</div>
              <div style={{ fontSize:'.8rem', color:'var(--gray-300)', marginTop:4 }}>Click any row to view full details here.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      <Modal open={addOpen} title="Add RTO Payment" onClose={() => setAddOpen(false)} onSubmit={handleAdd} submitLabel="Add Payment" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="File Number *">
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))} required>
                <option value="">Select file…</option>
                {filesList.length ? filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                )) : mockFiles.map(mf => (
                  <option key={mf.id} value={mf.id}>{mf.id} – {mf.customer}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Payment Date *"><input className="form-input" type="date" value={form.payment_date} onChange={f('payment_date')} required /></FormField>
            <FormField label="Amount (₹) *"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} placeholder="0" required /></FormField>
            <FormField label="Payment Mode *">
              <select className="form-select" style={{ width:'100%' }} value={form.payment_mode} onChange={f('payment_mode')}>
                {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Dealer Name"><input className="form-input" value={form.payee_dealer_name} onChange={f('payee_dealer_name')} placeholder="master_dealer.dealer_name" /></FormField>
            <FormField label="Payee Broker Name"><input className="form-input" value={form.payee_broker_name} onChange={f('payee_broker_name')} placeholder="master_broker.broker_name" /></FormField>
            
            {/* Cheque specific fields */}
            {isCheque && (
              <>
                <FormField label="Cheque No. *"><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} placeholder="Cheque number" required /></FormField>
                <FormField label="Cheque Date"><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} /></FormField>
                <FormField label="Cheque Bank Name"><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} placeholder="Bank name" /></FormField>
                <FormField label="Branch Name"><input className="form-input" value={form.branch_name} onChange={f('branch_name')} placeholder="Branch name" /></FormField>
                <FormField label="Cheque Amount (₹)"><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} placeholder="Cheque amount" /></FormField>
              </>
            )}

            {/* Online specific fields */}
            {isOnline && (
              <>
                <FormField label="UTR / Ref No. *"><input className="form-input" value={form.utr_no} onChange={f('utr_no')} placeholder="UTR or reference number" required /></FormField>
                <FormField label="Bank Account No."><input className="form-input" value={form.bank_account_no} onChange={f('bank_account_no')} placeholder="Account number" /></FormField>
                <FormField label="IFSC Code"><input className="form-input" value={form.ifsc_code} onChange={f('ifsc_code')} placeholder="IFSC code" /></FormField>
              </>
            )}
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>
 
      {/* ── Edit Modal ── */}
      <Modal open={editOpen} title={`Edit Payment — ${selected?.id}`} onClose={() => setEditOpen(false)} onSubmit={handleEdit} submitLabel="Save Changes" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="File Number">
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))}>
                <option value="">Select file…</option>
                {filesList.length ? filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
                )) : mockFiles.map(mf => (
                  <option key={mf.id} value={mf.id}>{mf.id} – {mf.customer}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Payment Date"><input className="form-input" type="date" value={form.payment_date} onChange={f('payment_date')} /></FormField>
            <FormField label="Amount (₹)"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} /></FormField>
            <FormField label="Payment Mode">
              <select className="form-select" style={{ width:'100%' }} value={form.payment_mode} onChange={f('payment_mode')}>
                {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Dealer"><input className="form-input" value={form.payee_dealer_name} onChange={f('payee_dealer_name')} /></FormField>
            <FormField label="Payee Broker"><input className="form-input" value={form.payee_broker_name} onChange={f('payee_broker_name')} /></FormField>
            
            {/* Cheque specific fields */}
            {isCheque && (
              <>
                <FormField label="Cheque No. *"><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} required /></FormField>
                <FormField label="Cheque Date"><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} /></FormField>
                <FormField label="Cheque Bank Name"><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} /></FormField>
                <FormField label="Branch Name"><input className="form-input" value={form.branch_name} onChange={f('branch_name')} /></FormField>
                <FormField label="Cheque Amount (₹)"><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} /></FormField>
              </>
            )}

            {/* Online specific fields */}
            {isOnline && (
              <>
                <FormField label="UTR / Ref No. *"><input className="form-input" value={form.utr_no} onChange={f('utr_no')} required /></FormField>
                <FormField label="Bank Account No."><input className="form-input" value={form.bank_account_no} onChange={f('bank_account_no')} /></FormField>
                <FormField label="IFSC Code"><input className="form-input" value={form.ifsc_code} onChange={f('ifsc_code')} /></FormField>
              </>
            )}
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>
    </div>
  )
}
