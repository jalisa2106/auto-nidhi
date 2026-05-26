import { useState, useEffect } from 'react'
import {
  Receipt, X, Search, Plus,
  FileText, Banknote, Calendar, CreditCard,
  Hash, AlignLeft, Building2, Users,
  TrendingUp, Landmark, Pencil, Trash2,
} from 'lucide-react'
import Modal from '../../components/app/Modal'
import { mockDealers, mockBrokers } from '../../lib/mockData'
import { rtoPaymentsApi, filesApi } from '../../api/services'
import { message } from 'antd'

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
  payee_dealer_name: string
  payee_broker_name: string
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

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatPaymentId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `RTO-${id.slice(0,8)}`
  return id
}

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

export default function RTOPaymentsPage() {
  const [rows,     setRows]     = useState<RTOPayment[]>([])
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<RTOPayment | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form,     setForm]     = useState<Omit<RTOPayment,'id'>>(emptyForm())
  const [filesList, setFilesList] = useState<any[]>([])

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

  const isCheque = form.payment_mode === 'cheque'
  const isOnline = ['rtgs', 'neft', 'imps', 'upi'].includes(form.payment_mode)

  const totalAmount  = rows.reduce((s, r) => s + r.amount, 0)
  const uniquePayees = new Set(rows.map(r => getPayeeName(r))).size
  const avgAmount    = rows.length ? Math.round(totalAmount / rows.length) : 0

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return r.id.toLowerCase().includes(q) || r.file_number.toLowerCase().includes(q) || getPayeeName(r).toLowerCase().includes(q) || r.payment_mode.toLowerCase().includes(q)
  })

  const handleAdd = async () => {
    if (!filesList.length) {
      setError('Cannot create payment: files not loaded from server. Please ensure backend /api/v1/files is reachable.')
      return
    }

    if (!form.file_number) { setError('Please select a file'); return }
    if (!form.payment_date) { setError('Please select a payment date'); return }
    if (!form.amount || Number(form.amount) <= 0) { setError('Please enter a valid amount'); return }

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

      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (form.payee_dealer_name && uuidRe.test(String(form.payee_dealer_name))) payload.payee_dealer_id = form.payee_dealer_name
      if (form.payee_broker_name && uuidRe.test(String(form.payee_broker_name))) payload.payee_broker_id = form.payee_broker_name

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
    try {
      setLoading(true)
      
      const payload: any = {
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        amount: Number(form.amount),
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
      
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (form.payee_dealer_name && uuidRe.test(String(form.payee_dealer_name))) {
          payload.payee_dealer_id = form.payee_dealer_name
          payload.payee_broker_id = null
      } else if (form.payee_broker_name && uuidRe.test(String(form.payee_broker_name))) {
          payload.payee_broker_id = form.payee_broker_name
          payload.payee_dealer_id = null
      }

      if (!selected) return;

      await rtoPaymentsApi.update(selected.id, payload)
      
      message.success("Payment updated successfully")
      setEditOpen(false)
      setError(null) 
      setForm(emptyForm())
      
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

      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, minHeight:0, flex:1 }}>

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

      <Modal open={addOpen} title="Add RTO Payment" onClose={() => setAddOpen(false)} onSubmit={handleAdd} submitLabel="Add Payment" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="File Number *">
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))} required>
                <option value="">Select file…</option>
                {filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
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
            <FormField label="Payee Dealer">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_dealer_name}
                onChange={e => setForm(prev => ({ ...prev, payee_dealer_name: e.target.value, payee_broker_name: '' }))}>
                <option value="">None / Select dealer…</option>
                {mockDealers.map(d => <option key={d.id} value={d.name}>{d.name} — {d.city}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Broker">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_broker_name}
                onChange={e => setForm(prev => ({ ...prev, payee_broker_name: e.target.value, payee_dealer_name: '' }))}>
                <option value="">None / Select broker…</option>
                {mockBrokers.map(b => <option key={b.id} value={b.broker_name}>{b.broker_name} — {b.district}</option>)}
              </select>
            </FormField>
            
            {isCheque && (
              <>
                <FormField label="Cheque No. *"><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} placeholder="Cheque number" required /></FormField>
                <FormField label="Cheque Date"><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} /></FormField>
                <FormField label="Cheque Bank Name"><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} placeholder="Bank name" /></FormField>
                <FormField label="Branch Name"><input className="form-input" value={form.branch_name} onChange={f('branch_name')} placeholder="Branch name" /></FormField>
                <FormField label="Cheque Amount (₹)"><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} placeholder="Cheque amount" /></FormField>
              </>
            )}

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
 
      <Modal open={editOpen} title={`Edit Payment — ${selected?.id ? formatPaymentId(selected.id) : ''}`} onClose={() => setEditOpen(false)} onSubmit={handleEdit} submitLabel="Save Changes" maxWidth="760px">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="File Number">
              <select className="form-input" style={{ width:'100%' }} value={form.file_number}
                onChange={e => setForm(prev => ({ ...prev, file_number: e.target.value }))}>
                <option value="">Select file…</option>
                {filesList.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_number} – {f.customer}</option>
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
            <FormField label="Payee Dealer">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_dealer_name}
                onChange={e => setForm(prev => ({ ...prev, payee_dealer_name: e.target.value, payee_broker_name: '' }))}>
                <option value="">None / Select dealer…</option>
                {mockDealers.map(d => <option key={d.id} value={d.name}>{d.name} — {d.city}</option>)}
              </select>
            </FormField>
            <FormField label="Payee Broker">
              <select className="form-input" style={{ width:'100%' }} value={form.payee_broker_name}
                onChange={e => setForm(prev => ({ ...prev, payee_broker_name: e.target.value, payee_dealer_name: '' }))}>
                <option value="">None / Select broker…</option>
                {mockBrokers.map(b => <option key={b.id} value={b.broker_name}>{b.broker_name} — {b.district}</option>)}
              </select>
            </FormField>
            
            {isCheque && (
              <>
                <FormField label="Cheque No. *"><input className="form-input" value={form.cheque_no} onChange={f('cheque_no')} required /></FormField>
                <FormField label="Cheque Date"><input className="form-input" type="date" value={form.cheque_date} onChange={f('cheque_date')} /></FormField>
                <FormField label="Cheque Bank Name"><input className="form-input" value={form.cheque_bank_name} onChange={f('cheque_bank_name')} /></FormField>
                <FormField label="Branch Name"><input className="form-input" value={form.branch_name} onChange={f('branch_name')} /></FormField>
                <FormField label="Cheque Amount (₹)"><input className="form-input" type="number" value={form.cheque_amount || ''} onChange={f('cheque_amount')} /></FormField>
              </>
            )}

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