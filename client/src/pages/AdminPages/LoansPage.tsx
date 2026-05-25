import { useState } from 'react'
import {
  PiggyBank, CheckCircle2, AlertTriangle,
  LayoutList, Search, X, TrendingUp,
  Calendar, Building2, CreditCard, User,
  Phone, MapPin, Banknote, Clock, Hash,
  Pencil, Trash2,
} from 'lucide-react'
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

const mockLoans: LoanRecord[] = [
  { file_number:'FILE-001', lan_number:'LAN-HDFC-4521',  full_name:'Arjun Mehta',    mobile_1:'9876543210', city:'Ahmedabad',     bank_name:'HDFC Bank',      loan_amount:850000,  docket_date:'2023-06-15', no_of_months:60, emi_amount:18200, status:'disbursed', irr_percentage:10.5,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-002', lan_number:'LAN-SBI-8832',   full_name:'Priya Sharma',   mobile_1:'9123456789', city:'Surat',         bank_name:'SBI',            loan_amount:500000,  docket_date:'2022-03-10', no_of_months:48, emi_amount:12500, status:'completed', irr_percentage:9.8,   created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-003', lan_number:'LAN-ICICI-2201', full_name:'Rahul Patel',    mobile_1:'9988776655', city:'Vadodara',      bank_name:'ICICI Bank',     loan_amount:1200000, docket_date:'2023-11-01', no_of_months:84, emi_amount:19500, status:'disbursed', irr_percentage:11.2,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-004', lan_number:'LAN-AXIS-3310',  full_name:'Sneha Joshi',    mobile_1:'9765432100', city:'Rajkot',        bank_name:'Axis Bank',      loan_amount:350000,  docket_date:'2021-08-20', no_of_months:36, emi_amount:11100, status:'completed', irr_percentage:10.0,  created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-005', lan_number:'LAN-KOTAK-5590', full_name:'Vikram Singh',   mobile_1:'9654321098', city:'Gandhinagar',   bank_name:'Kotak Bank',     loan_amount:750000,  docket_date:'2022-12-05', no_of_months:60, emi_amount:16200, status:'cancelled', irr_percentage:10.75, created_by_name:'Ravi',   remarks:'Customer requested premature closure' },
  { file_number:'FILE-006', lan_number:'LAN-PNB-6612',   full_name:'Kavita Desai',   mobile_1:'9543210987', city:'Anand',         bank_name:'PNB',            loan_amount:425000,  docket_date:'2023-04-18', no_of_months:48, emi_amount:10800, status:'disbursed', irr_percentage:9.5,   created_by_name:'Suresh', remarks:'' },
  { file_number:'FILE-007', lan_number:'LAN-BOB-7721',   full_name:'Deepak Nair',    mobile_1:'9432109876', city:'Bharuch',       bank_name:'Bank of Baroda', loan_amount:620000,  docket_date:'2022-07-30', no_of_months:60, emi_amount:13400, status:'disbursed', irr_percentage:10.2,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-008', lan_number:'LAN-UBI-8830',   full_name:'Anjali Rao',     mobile_1:'9321098765', city:'Mehsana',       bank_name:'Union Bank',     loan_amount:280000,  docket_date:'2020-11-11', no_of_months:36, emi_amount:8900,  status:'completed', irr_percentage:9.0,   created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-009', lan_number:'LAN-HDFC-9943',  full_name:'Suresh Kumar',   mobile_1:'9210987654', city:'Bhavnagar',     bank_name:'HDFC Bank',      loan_amount:950000,  docket_date:'2024-01-20', no_of_months:84, emi_amount:16800, status:'disbursed', irr_percentage:11.0,  created_by_name:'Suresh', remarks:'' },
  { file_number:'FILE-010', lan_number:'LAN-ICICI-1056', full_name:'Meena Trivedi',  mobile_1:'9109876543', city:'Jamnagar',      bank_name:'ICICI Bank',     loan_amount:390000,  docket_date:'2021-05-22', no_of_months:48, emi_amount:9800,  status:'cancelled', irr_percentage:10.5,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-011', lan_number:'LAN-SBI-1123',   full_name:'Rohit Verma',    mobile_1:'9098765432', city:'Nadiad',        bank_name:'SBI',            loan_amount:700000,  docket_date:'2023-09-01', no_of_months:60, emi_amount:15200, status:'disbursed', irr_percentage:9.75,  created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-012', lan_number:'LAN-AXIS-1245',  full_name:'Nisha Gupta',    mobile_1:'8987654321', city:'Ankleshwar',    bank_name:'Axis Bank',      loan_amount:540000,  docket_date:'2022-10-10', no_of_months:60, emi_amount:11600, status:'completed', irr_percentage:10.25, created_by_name:'Suresh', remarks:'' },
  { file_number:'FILE-013', lan_number:'LAN-KOTAK-1360', full_name:'Amit Shah',      mobile_1:'8876543210', city:'Morbi',         bank_name:'Kotak Bank',     loan_amount:1100000, docket_date:'2023-03-15', no_of_months:84, emi_amount:18400, status:'disbursed', irr_percentage:10.9,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-014', lan_number:'LAN-PNB-1478',   full_name:'Pooja Bhat',     mobile_1:'8765432109', city:'Botad',         bank_name:'PNB',            loan_amount:310000,  docket_date:'2021-02-28', no_of_months:36, emi_amount:9800,  status:'completed', irr_percentage:9.25,  created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-015', lan_number:'LAN-BOB-1589',   full_name:'Kiran Pillai',   mobile_1:'8654321098', city:'Surendranagar', bank_name:'Bank of Baroda', loan_amount:830000,  docket_date:'2024-02-10', no_of_months:72, emi_amount:14800, status:'disbursed', irr_percentage:10.8,  created_by_name:'Suresh', remarks:'' },
  { file_number:'FILE-016', lan_number:'LAN-HDFC-1603',  full_name:'Ravi Chandran',  mobile_1:'8543210987', city:'Patan',         bank_name:'HDFC Bank',      loan_amount:480000,  docket_date:'2022-04-20', no_of_months:48, emi_amount:12100, status:'disbursed', irr_percentage:10.4,  created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-017', lan_number:'LAN-ICICI-1712', full_name:'Swati Mishra',   mobile_1:'8432109876', city:'Dahod',         bank_name:'ICICI Bank',     loan_amount:260000,  docket_date:'2020-09-05', no_of_months:36, emi_amount:8300,  status:'completed', irr_percentage:9.0,   created_by_name:'Meena',  remarks:'' },
  { file_number:'FILE-018', lan_number:'LAN-UBI-1821',   full_name:'Gaurav Tiwari',  mobile_1:'8321098765', city:'Valsad',        bank_name:'Union Bank',     loan_amount:920000,  docket_date:'2023-08-12', no_of_months:84, emi_amount:16000, status:'disbursed', irr_percentage:11.1,  created_by_name:'Suresh', remarks:'' },
  { file_number:'FILE-019', lan_number:'LAN-SBI-1934',   full_name:'Divya Pillai',   mobile_1:'8210987654', city:'Navsari',       bank_name:'SBI',            loan_amount:375000,  docket_date:'2021-12-15', no_of_months:48, emi_amount:9500,  status:'cancelled', irr_percentage:9.8,   created_by_name:'Ravi',   remarks:'' },
  { file_number:'FILE-020', lan_number:'LAN-AXIS-2046',  full_name:'Manoj Kapoor',   mobile_1:'8109876543', city:'Amreli',        bank_name:'Axis Bank',      loan_amount:650000,  docket_date:'2023-01-08', no_of_months:60, emi_amount:14000, status:'disbursed', irr_percentage:10.6,  created_by_name:'Suresh', remarks:'' },
]

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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LoansPage() {
  const [rows,         setRows]         = useState<LoanRecord[]>(mockLoans)
  const [search,       setSearch]       = useState('')
  const [selected,     setSelected]     = useState<LoanRecord | null>(null)
  const [filterStatus, setFilterStatus] = useState<'All' | LoanRecord['status']>('All')

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState<{ remarks: string; status: LoanRecord['status'] }>({ remarks: '', status: 'disbursed' })

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

  // ── Handlers ──
  const openEdit = (loan: LoanRecord) => {
    setEditForm({ remarks: loan.remarks, status: loan.status })
    setEditOpen(true)
  }

  const handleEdit = () => {
    // PATCH /api/loans/:file_number  →  body: { remarks, status }
    setRows(prev => prev.map(l =>
      l.file_number === selected!.file_number ? { ...l, ...editForm } : l
    ))
    setSelected(prev => prev ? { ...prev, ...editForm } : prev)
    setEditOpen(false)
  }

  const handleDelete = (_fileNumber: string) => {
    // ─── SOFT DELETE — BACKEND ACTION REQUIRED ────────────────────────────────
    // Before uncommenting: add this column to DB:
    //   ALTER TABLE file_record ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    // API call: PATCH /api/loans/:file_number  →  body: { is_deleted: true }
    //
    // setRows(prev => prev.filter(l => l.file_number !== _fileNumber))
    // setSelected(null)
    // ─────────────────────────────────────────────────────────────────────────
    alert('Soft delete is pending. Backend needs to add is_deleted column to file_record table.')
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
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, minHeight:0, flex:1 }}>

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
                <input id="loans-search" placeholder="Search loans…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding:'8px 12px 8px 32px', border:'1.5px solid var(--gray-200)', borderRadius:8, fontSize:'.85rem', outline:'none', fontFamily:'inherit', width:180, transition:'border-color .15s' }}
                  onFocus={e => (e.target.style.borderColor='var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor='var(--gray-200)')} />
              </div>
            </div>
          </div>

          {/* Table body */}
          <div style={{ overflowY:'auto', flex:1 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>
                  {['File No.','LAN No.','Customer','Bank','Loan Amount','Progress','EMI/mo','Status'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--gray-500)', background:'var(--surface-1)', borderBottom:'1px solid var(--gray-100)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No loans match your search.</td></tr>
                ) : filtered.map(loan => {
                  const isSelected  = selected?.file_number === loan.file_number
                  const uiStatus    = dbStatusToUI[loan.status]
                  const sm          = statusMeta[uiStatus]
                  const completedMo = Math.min(calcCompletedMonths(loan.docket_date), loan.no_of_months)
                  const progress    = Math.round((completedMo / loan.no_of_months) * 100)
                  return (
                    <tr key={loan.file_number} id={`loan-row-${loan.file_number}`} onClick={() => setSelected(isSelected ? null : loan)}
                      style={{ cursor:'pointer', background: isSelected ? 'var(--brand-50)' : 'transparent', borderLeft: isSelected ? '3px solid var(--brand-500)' : '3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='var(--surface-1)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='transparent' }}>
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
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {selected ? (() => {
            const uiStatus    = dbStatusToUI[selected.status]
            const sm          = statusMeta[uiStatus]
            const completedMo = Math.min(calcCompletedMonths(selected.docket_date), selected.no_of_months)
            const progress    = Math.round((completedMo / selected.no_of_months) * 100)
            return (
              <>
                {/* Panel header */}
                <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'linear-gradient(135deg, var(--brand-800), var(--brand-900))' }}>
                  <div>
                    <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.6)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Loan Details</div>
                    <div style={{ fontSize:'1rem', fontWeight:700, color:'#fff', marginTop:2 }}>{selected.file_number}</div>
                  </div>
                  <button id="close-loan-detail" onClick={() => setSelected(null)}
                    style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'none' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.25)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.15)')}>
                    <X size={14} />
                  </button>
                </div>

                {/* Avatar + name */}
                <div style={{ padding:'18px', display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid var(--gray-100)' }}>
                  <div style={{ width:58, height:58, borderRadius:'50%', background:'linear-gradient(135deg, var(--brand-500), var(--brand-700))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', fontWeight:800, marginBottom:10, boxShadow:'0 4px 12px rgba(37,99,235,.30)' }}>
                    {selected.full_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--gray-900)' }}>{selected.full_name}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--gray-400)', marginTop:3 }}>{selected.mobile_1}</div>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:'var(--radius-full)', fontSize:'.75rem', fontWeight:700, color:sm.color, background:sm.bg, marginTop:8 }}>
                    {sm.icon} {uiStatus}
                  </span>

                  {/* Edit & Delete action buttons */}
                  <div style={{ display:'flex', gap:8, marginTop:14 }}>
                    <button id={`loan-edit-${selected.file_number}`} onClick={() => openEdit(selected)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--brand-200)', background:'var(--brand-50)', color:'var(--brand-700)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='var(--brand-100)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)' }}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button id={`loan-delete-${selected.file_number}`} onClick={() => handleDelete(selected.file_number)}
                      style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid #fee2e2', background:'#fff5f5', color:'#b91c1c', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='#fee2e2' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='#fff5f5' }}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--gray-100)' }}>
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

                {/* Detail rows */}
                <div style={{ padding:'4px 18px 16px', overflowY:'auto', flex:1 }}>
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
              </>
            )
          })() : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'var(--gray-300)' }}>
              <PiggyBank size={52} strokeWidth={1.2} />
              <div style={{ marginTop:14, fontSize:'.9rem', fontWeight:600, color:'var(--gray-400)' }}>Select a loan</div>
              <div style={{ fontSize:'.8rem', color:'var(--gray-300)', marginTop:4 }}>Click any row to view full details here.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal (remarks + status only) ── */}
      <Modal open={editOpen} title={`Edit Loan — ${selected?.file_number}`} onClose={() => setEditOpen(false)} onSubmit={handleEdit} submitLabel="Save Changes">
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
              Remarks
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

// needed for DetailRow AlignLeft import
import { AlignLeft } from 'lucide-react'