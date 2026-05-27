import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2, AlertTriangle,
  LayoutList, Search, X, TrendingUp,
  Calendar, Building2, CreditCard, User,
  Phone, MapPin, Banknote, Clock, Hash,
  Pencil, Trash2, AlignLeft,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye,
} from 'lucide-react'
import { loansApi } from '../../api/services'
import Modal from '../../components/app/Modal'

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/loans         → fetch all loans (JOIN query documented below)
// PATCH /api/loans/:id    → body: { remarks, status }   (edit remarks/status only)
// DELETE /api/loans/:id   → soft delete (see handleDelete comment below)
//
// DB query: SELECT
//   f.file_number, f.docket_date, f.status, f.created_by_user_id,
//   fi.lan_number, fi.loan_amount, fi.emi_amount, fi.no_of_months, fi.irr_percentage,
//   c.full_name, c.mobile_1, c.city,
//   mb.bank_name,
//   u.first_name AS created_by_name
// FROM file_record f
// JOIN customer c         ON c.id  = f.customer_id
// JOIN finance_info fi    ON fi.file_id = f.id
// JOIN master_bank mb     ON mb.id = fi.bank_id
// LEFT JOIN system_user u ON u.id  = f.created_by_user_id
// WHERE f.status IN ('disbursed','completed','cancelled')
// ─────────────────────────────────────────────────────────────────────────────

// NOTE: Loans are created only from inside a File — no "Add Loan" here.

interface LoanRecord {
  file_number    : string
  docket_date    : string
  status         : 'disbursed' | 'completed' | 'cancelled'
  lan_number     : string
  loan_amount    : number
  emi_amount     : number
  no_of_months   : number
  irr_percentage : number
  full_name      : string
  mobile_1       : string
  city           : string
  bank_name      : string
  created_by_name: string
  remarks        : string   // finance_info or file_record remarks
}

type UIStatus = 'Running' | 'Completed' | 'Premature'
const dbStatusToUI: Record<LoanRecord['status'], UIStatus> = {
  disbursed: 'Running',
  completed: 'Completed',
  cancelled: 'Premature',
}
const uiToDbStatus: Record<UIStatus, LoanRecord['status']> = {
  Running  : 'disbursed',
  Completed: 'completed',
  Premature: 'cancelled',
}

function calcCompletedMonths(docketDate: string): number {
  const start = new Date(docketDate)
  const now   = new Date()
  return Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  )
}

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

const statusMeta: Record<UIStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  Running  : { color: '#1d4ed8', bg: '#eff6ff', icon: <TrendingUp    size={12} /> },
  Completed: { color: '#15803d', bg: '#dcfce7', icon: <CheckCircle2  size={12} /> },
  Premature: { color: '#b91c1c', bg: '#fee2e2', icon: <AlertTriangle size={12} /> },
}

// ── Sub-components ────────────────────────────────────────────────────────────
interface LoanStatProps {
  icon: React.ReactNode; label: string; value: number | string
  iconBg: string; iconColor: string; accent?: string
}
function LoanStat({ icon, label, value, iconBg, iconColor, accent }: LoanStatProps) {
  return (
    <div
      style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', padding:'18px 20px', boxShadow:'var(--shadow-sm)', display:'flex', alignItems:'center', gap:14, transition:'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow='var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform='translateY(0)';    (e.currentTarget as HTMLDivElement).style.boxShadow='var(--shadow-sm)' }}
    >
      <div style={{ width:44, height:44, borderRadius:'var(--radius-sm)', background:iconBg, color:iconColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
      <div>
        <div style={{ fontSize:'.75rem', color:'var(--gray-500)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>{label}</div>
        <div style={{ fontSize:'1.75rem', fontWeight:800, color:accent||'var(--gray-900)', lineHeight:1.1, marginTop:2 }}>{value}</div>
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
        <span className="pagination-info">Showing {start}–{end} of {total} records</span>
        <select className="page-size-select" value={pageSize} onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1) }}>
          {[5, 10, 20].map((s) => <option key={s} value={s}>{s} / page</option>)}
        </select>
      </div>
      <div className="pagination-controls">
        <button className="page-btn" onClick={() => onPage(1)} disabled={page === 1} title="First"><ChevronsLeft size={14} /></button>
        <button className="page-btn" onClick={() => onPage(page - 1)} disabled={page === 1} title="Prev"><ChevronLeft size={14} /></button>
        {pages.map((p, i) => p === '...' ? (
          <span key={`d${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: '.84rem' }}>…</span>
        ) : (
          <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => onPage(p as number)}>{p}</button>
        ))}
        <button className="page-btn" onClick={() => onPage(page + 1)} disabled={page === totalPages} title="Next"><ChevronRight size={14} /></button>
        <button className="page-btn" onClick={() => onPage(totalPages)} disabled={page === totalPages} title="Last"><ChevronsRight size={14} /></button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoansPage() {
  const [rows,         setRows]         = useState<LoanRecord[]>([])
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<LoanRecord | null>(null)
  const [filterStatus, setFilterStatus] = useState<'All' | LoanRecord['status']>('All')

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<{ remarks: string; status: LoanRecord['status'] }>({ remarks: '', status: 'disbursed' })

  const [viewOpen, setViewOpen] = useState(false)
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const closeView = useCallback(() => { setViewOpen(false); setSelected(null) }, [])
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeView() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [closeView])

  useEffect(() => {
    const loadLoans = async () => {
      const data = await loansApi.list()
      setRows(data?.data ?? [])
    }

    void loadLoans()
  }, [])

  // ── Stats ──
  const running   = rows.filter(l => l.status === 'disbursed').length
  const completed = rows.filter(l => l.status === 'completed').length
  const premature = rows.filter(l => l.status === 'cancelled').length
  const total     = rows.length

  const filtered = rows.filter(l => {
    const q = search.toLowerCase()
    const match = l.full_name.toLowerCase().includes(q) || l.file_number.toLowerCase().includes(q) || l.lan_number.toLowerCase().includes(q) || l.bank_name.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'All' || l.status === filterStatus
    return match && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // ── Handlers ──
  const openEdit = (loan: LoanRecord) => {
    setEditForm({ remarks: loan.remarks, status: loan.status })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editForm.remarks || !editForm.remarks.trim()) {
      alert('Remarks are required')
      return
    }
    try {
      // PATCH /api/loans/:file_number  →  body: { remarks, status }
      await loansApi.update(selected!.file_number, editForm)

      setRows(prev => prev.map(l =>
        l.file_number === selected!.file_number ? { ...l, ...editForm } : l
      ))
      setEditOpen(false)
      setSelected(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update loan')
    }
  }

  // const handleDelete = (_fileNumber: string) => {
  //   // ─── SOFT DELETE — BACKEND ACTION REQUIRED ────────────────────────────────
  //   // Before uncommenting: add this column to DB:
  //   //   ALTER TABLE file_record ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
  //   // API call: PATCH /api/loans/:file_number  →  body: { is_deleted: true }
  //   //
  //   // setRows(prev => prev.filter(l => l.file_number !== _fileNumber))
  //   // setSelected(null)
  //   // ─────────────────────────────────────────────────────────────────────────
  //   alert('Soft delete is pending. Backend needs to add is_deleted column to file_record table.')
  // }
  
  const handleDelete = async (_fileNumber: string) => {
    try {
      await loansApi.softDelete(_fileNumber)

      setRows(prev => prev.filter(l => l.file_number !== _fileNumber))
      setSelected(null)
    } catch (err) {
      console.error(err)
      alert('Failed to delete loan')
    }
  }

  const filterPills = [
    { label:'All',       dbVal:'All'       as const },
    { label:'Running',   dbVal:'disbursed' as const },
    { label:'Completed', dbVal:'completed' as const },
    { label:'Premature', dbVal:'cancelled' as const },
  ]
  const pillColor = (dbVal: string) =>
    dbVal === 'All' ? 'var(--brand-600)' : dbVal === 'disbursed' ? '#1d4ed8' : dbVal === 'completed' ? '#15803d' : '#b91c1c'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:20 }}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        <LoanStat icon={<TrendingUp size={20}/>}    label="Running Loans"    value={running}   iconBg="#eff6ff"         iconColor="#1d4ed8"          accent="#1d4ed8" />
        <LoanStat icon={<CheckCircle2 size={20}/>}  label="Completed Loans"  value={completed} iconBg="#dcfce7"         iconColor="#15803d"          accent="#15803d" />
        <LoanStat icon={<AlertTriangle size={20}/>} label="Premature Closure"value={premature} iconBg="#fee2e2"         iconColor="#b91c1c"          accent="#b91c1c" />
        <LoanStat icon={<LayoutList size={20}/>}    label="Total Loans"      value={total}     iconBg="var(--brand-50)" iconColor="var(--brand-600)"              />
      </div>

      {/* Main area */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:16, minHeight:0, flex:1 }}>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {/* Toolbar */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--gray-100)', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--gray-900)' }}>
              All Loan Records
              <span style={{ marginLeft:8, fontSize:'.75rem', color:'var(--gray-400)', fontWeight:500 }}>{filtered.length} entries</span>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ display:'flex', gap:6 }}>
                {filterPills.map(p => (
                  <button key={p.dbVal} id={`loan-filter-${p.dbVal}`} onClick={() => setFilterStatus(p.dbVal)}
                    style={{ padding:'5px 12px', borderRadius:'var(--radius-full)', fontSize:'.78rem', fontWeight:600, cursor:'pointer', transition:'all .15s', border: filterStatus===p.dbVal ? '1.5px solid transparent' : '1.5px solid var(--gray-200)', background: filterStatus===p.dbVal ? pillColor(p.dbVal) : '#fff', color: filterStatus===p.dbVal ? '#fff' : 'var(--gray-600)' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                <input id="loans-search" placeholder="Search loans…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ padding:'8px 12px 8px 32px', border:'1.5px solid var(--gray-200)', borderRadius:8, fontSize:'.85rem', outline:'none', fontFamily:'inherit', width:180, transition:'border-color .15s' }}
                  onFocus={e => (e.target.style.borderColor='var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor='var(--gray-200)')} />
              </div>
            </div>
          </div>

          {/* Table body */}
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>
                  {['#','File No.','LAN No.','Customer','Bank','Loan Amount','Progress','EMI/mo','Status','Action'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--gray-500)', background:'var(--surface-1)', borderBottom:'1px solid var(--gray-100)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No loans match your search.</td></tr>
                ) : pageRows.map((loan, i) => {
                  const uiStatus    = dbStatusToUI[loan.status]
                  const sm          = statusMeta[uiStatus]
                  const completedMo = Math.min(calcCompletedMonths(loan.docket_date), loan.no_of_months)
                  const progress    = Math.round((completedMo / loan.no_of_months) * 100)
                  return (
                    <tr key={loan.file_number} id={`loan-row-${loan.file_number}`}
                      style={{ cursor:'default', background:'transparent', borderLeft:'3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background='var(--surface-1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background='transparent' }}>
                      <td style={{ padding:'12px 14px', color:'var(--gray-500)', fontSize:'.8rem' }}>{(safePage-1)*pageSize+i+1}</td>
                      <td style={{ padding:'12px 14px', color:'var(--brand-700)', fontWeight:600 }}>{loan.file_number}</td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-500)', fontSize:'.8rem' }}>{loan.lan_number}</td>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:'var(--gray-900)' }}>
                        <div>{loan.full_name}</div>
                        <div style={{ fontSize:'.75rem', color:'var(--gray-400)', fontWeight:400 }}>{loan.city}</div>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-700)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}><Building2 size={13} color="var(--gray-400)" />{loan.bank_name}</div>
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:600, color:'var(--gray-900)' }}>{fmt(loan.loan_amount)}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ fontSize:'.78rem', color:'var(--gray-600)', marginBottom:5 }}>{completedMo}/{loan.no_of_months} mo</div>
                        <div style={{ height:6, background:'var(--gray-100)', borderRadius:6, overflow:'hidden', width:80 }}>
                          <div style={{ height:'100%', width:`${progress}%`, borderRadius:6, transition:'width .3s', background: loan.status==='completed' ? '#15803d' : loan.status==='cancelled' ? '#b91c1c' : 'var(--brand-500)' }} />
                        </div>
                        <div style={{ fontSize:'.7rem', color:'var(--gray-400)', marginTop:3 }}>{progress}%</div>
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-700)' }}>{fmt(loan.emi_amount)}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:'var(--radius-full)', fontSize:'.72rem', fontWeight:700, color:sm.color, background:sm.bg }}>
                          {sm.icon} {uiStatus}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px' }}><button className="btn btn-outline btn-sm" style={{ padding:'5px 12px', fontSize:'.78rem' }} onClick={() => { setSelected(loan); setViewOpen(true) }} title="View details"><Eye size={13} /></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filtered.length} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>

      </div>

      {viewOpen && selected && (() => {
        const uiStatus    = dbStatusToUI[selected.status]
        const sm          = statusMeta[uiStatus]
        const completedMo = Math.min(calcCompletedMonths(selected.docket_date), selected.no_of_months)
        const progress    = Math.round((completedMo / selected.no_of_months) * 100)
        return (
          <div className="modal-backdrop" onClick={closeView}>
            <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Loan — {selected.file_number}</h3>
                <button className="btn btn-ghost btn-sm" onClick={closeView}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0 20px', borderBottom:'1px solid var(--gray-100)', marginBottom:16 }}>
                  <div style={{ width:58, height:58, borderRadius:'50%', background:'linear-gradient(135deg, var(--brand-500), var(--brand-700))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', fontWeight:800, marginBottom:10, boxShadow:'0 4px 12px rgba(37,99,235,.30)' }}>
                    {selected.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--gray-900)' }}>{selected.full_name}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gray-400)', marginTop:3 }}>{selected.mobile_1}</div>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:'var(--radius-full)', fontSize:'.75rem', fontWeight:700, color:sm.color, background:sm.bg, marginTop:8 }}>
                    {sm.icon} {uiStatus}
                  </span>
                  <div style={{ display:'flex', gap:8, marginTop:14 }}>
                    <button id={`loan-edit-${selected.file_number}`} onClick={() => { openEdit(selected); setViewOpen(false) }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--brand-200)', background:'var(--brand-50)', color:'var(--brand-700)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='var(--brand-100)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)' }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button id={`loan-delete-${selected.file_number}`} onClick={() => { handleDelete(selected.file_number); closeView() }}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid #fee2e2', background:'#fff5f5', color:'#b91c1c', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#fee2e2' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#fff5f5' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
                <div style={{ padding:'14px 0', borderBottom:'1px solid var(--gray-100)', marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:'.78rem', fontWeight:600, color:'var(--gray-600)' }}>Repayment Progress</span>
                    <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--brand-600)' }}>{progress}%</span>
                  </div>
                  <div style={{ height:8, background:'var(--gray-100)', borderRadius:8 }}>
                    <div style={{ height:'100%', width:`${progress}%`, borderRadius:8, transition:'width .4s', background: selected.status==='completed' ? '#15803d' : selected.status==='cancelled' ? '#b91c1c' : 'linear-gradient(90deg, var(--brand-500), var(--brand-700))' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:5, fontSize:'.72rem', color:'var(--gray-400)' }}>
                    <span>{completedMo} months paid</span>
                    <span>{selected.no_of_months - completedMo} months left</span>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
                  <DetailRow icon={<User       size={14}/>} label="Customer"       value={selected.full_name} />
                  <DetailRow icon={<Phone      size={14}/>} label="Mobile"         value={selected.mobile_1} />
                  <DetailRow icon={<MapPin     size={14}/>} label="City"           value={selected.city} />
                  <DetailRow icon={<Building2  size={14}/>} label="Bank"           value={selected.bank_name} />
                  <DetailRow icon={<Hash       size={14}/>} label="LAN Number"     value={selected.lan_number} />
                  <DetailRow icon={<Banknote   size={14}/>} label="Loan Amount"    value={`₹${selected.loan_amount.toLocaleString('en-IN')}`} />
                  <DetailRow icon={<CreditCard size={14}/>} label="Monthly EMI"   value={`₹${selected.emi_amount.toLocaleString('en-IN')}`} />
                  <DetailRow icon={<TrendingUp size={14}/>} label="Interest Rate"  value={`${selected.irr_percentage}% p.a.`} />
                  <DetailRow icon={<Clock      size={14}/>} label="Tenure"         value={`${selected.no_of_months} months`} />
                  <DetailRow icon={<Calendar   size={14}/>} label="Docket Date"    value={selected.docket_date} />
                  <DetailRow icon={<User       size={14}/>} label="Created By"     value={selected.created_by_name} />
                  <DetailRow icon={<AlignLeft  size={14}/>} label="Remarks"        value={selected.remarks || '—'} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Edit Modal (remarks + status only) ── */}
      <Modal open={editOpen} title={`Edit Loan — ${selected?.file_number}`} onClose={() => { setEditOpen(false); setSelected(null); }} onSubmit={handleEdit} submitLabel="Save Changes">
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label">
              Status
              {/* file_record.status — only safe values for a loan */}
            </label>
            <select className="form-select" style={{ width:'100%' }} value={uiToDbStatus[dbStatusToUI[editForm.status]]}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value as LoanRecord['status'] }))}>
              <option value="disbursed">Running (disbursed)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Premature (cancelled)</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Remarks *
              {/* finance_info.remarks or file_record.remarks */}
            </label>
            <textarea className="form-input" rows={3} value={editForm.remarks}
              onChange={e => setEditForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Add a remark…" style={{ resize:'vertical' }} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
