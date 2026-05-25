import { useState } from 'react'
import {
  Wallet, X, Search, Plus,
  FileText, Banknote, Calendar,
  Hash, AlignLeft, User, Tag, Pencil, Trash2,
} from 'lucide-react'
import Modal from '../../components/app/Modal'

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/expenses       → fetch all (JOIN query below)
// POST   /api/expenses       → create new expense_ledger record
// PATCH  /api/expenses/:id   → update record
// DELETE /api/expenses/:id   → soft delete (see handleDelete)
//
// DB query: SELECT el.id, el.amount, el.expense_date, el.remarks, el.created_at,
//           ec.expense_name AS expense_category_name,
//           f.file_number,
//           u.first_name || ' ' || COALESCE(u.last_name,'') AS created_by_name
//           FROM expense_ledger el
//           JOIN  master_expense_category ec ON ec.id = el.expense_category_id
//           LEFT JOIN file_record f          ON f.id  = el.file_id
//           JOIN  system_user u              ON u.id  = el.created_by
//           ORDER BY el.expense_date DESC
// ─────────────────────────────────────────────────────────────────────────────

interface Expense {
  id                   : string   // expense_ledger.id (UUID)
  amount               : number   // expense_ledger.amount
  expense_date         : string   // expense_ledger.expense_date
  remarks              : string   // expense_ledger.remarks
  created_at           : string   // expense_ledger.created_at
  expense_category_name: string   // master_expense_category.expense_name (joined)
  file_number          : string   // file_record.file_number (nullable join, empty if none)
  created_by_name      : string   // system_user first+last name (joined via created_by)
}

const CATEGORIES = [
  'Office Supplies','Travel & Conveyance','Printing & Stationery',
  'Staff Meal','Internet & Phone','Repair & Maintenance',
  'Advertisement','Postage & Courier','Miscellaneous',
]

const emptyForm = (): Omit<Expense, 'id' | 'created_at'> => ({
  amount: 0, expense_date: '', remarks: '',
  expense_category_name: CATEGORIES[0],
  file_number: '', created_by_name: '',
})

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

const categoryColor = (name: string): { bg: string; color: string } => {
  const palette = [
    { bg:'#eff6ff', color:'#1d4ed8' }, { bg:'#fef3c7', color:'#92400e' },
    { bg:'#dcfce7', color:'#15803d' }, { bg:'#fce7f3', color:'#9d174d' },
    { bg:'#ede9fe', color:'#6d28d9' }, { bg:'#f0fdf4', color:'#166534' },
    { bg:'#fff7ed', color:'#9a3412' },
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return palette[h % palette.length]
}

const mockExpenses: Expense[] = [
  { id:'EXP-0001', expense_category_name:'Office Supplies',       amount:3200,  expense_date:'2024-01-08', file_number:'',        created_by_name:'Ravi Patel',   remarks:'Printer paper, pens, folders',            created_at:'2024-01-08T09:30:00Z' },
  { id:'EXP-0002', expense_category_name:'Travel & Conveyance',   amount:1850,  expense_date:'2024-01-15', file_number:'FILE-003',created_by_name:'Meena Shah',    remarks:'Fuel charges for site visit Vadodara',    created_at:'2024-01-15T11:00:00Z' },
  { id:'EXP-0003', expense_category_name:'Printing & Stationery', amount:780,   expense_date:'2024-01-22', file_number:'FILE-001',created_by_name:'Suresh Mehta',  remarks:'File stamp papers and receipts',          created_at:'2024-01-22T14:20:00Z' },
  { id:'EXP-0004', expense_category_name:'Staff Meal',            amount:2400,  expense_date:'2024-02-03', file_number:'',        created_by_name:'Ravi Patel',   remarks:'Office team lunch — monthly',             created_at:'2024-02-03T13:00:00Z' },
  { id:'EXP-0005', expense_category_name:'Internet & Phone',      amount:1499,  expense_date:'2024-02-10', file_number:'',        created_by_name:'Meena Shah',    remarks:'Monthly broadband + mobile recharge',     created_at:'2024-02-10T10:00:00Z' },
  { id:'EXP-0006', expense_category_name:'Travel & Conveyance',   amount:3100,  expense_date:'2024-02-18', file_number:'FILE-006',created_by_name:'Suresh Mehta',  remarks:'Taxi charges for customer document pickup',created_at:'2024-02-18T15:45:00Z' },
  { id:'EXP-0007', expense_category_name:'Repair & Maintenance',  amount:8500,  expense_date:'2024-03-02', file_number:'',        created_by_name:'Ravi Patel',   remarks:'AC servicing and electrical work',        created_at:'2024-03-02T09:00:00Z' },
  { id:'EXP-0008', expense_category_name:'Office Supplies',       amount:1200,  expense_date:'2024-03-11', file_number:'FILE-009',created_by_name:'Meena Shah',    remarks:'Toner cartridge replacement',             created_at:'2024-03-11T10:30:00Z' },
  { id:'EXP-0009', expense_category_name:'Advertisement',         amount:12000, expense_date:'2024-03-20', file_number:'',        created_by_name:'Ravi Patel',   remarks:'Facebook & Google ads — March campaign',  created_at:'2024-03-20T11:15:00Z' },
  { id:'EXP-0010', expense_category_name:'Postage & Courier',     amount:640,   expense_date:'2024-04-01', file_number:'FILE-011',created_by_name:'Suresh Mehta',  remarks:'Document courier to RTO Rajkot',          created_at:'2024-04-01T14:00:00Z' },
  { id:'EXP-0011', expense_category_name:'Staff Meal',            amount:2800,  expense_date:'2024-04-10', file_number:'',        created_by_name:'Meena Shah',    remarks:'Team dinner — quarterly review',          created_at:'2024-04-10T19:30:00Z' },
  { id:'EXP-0012', expense_category_name:'Miscellaneous',         amount:950,   expense_date:'2024-04-18', file_number:'FILE-013',created_by_name:'Ravi Patel',   remarks:'Notary charges for documents',            created_at:'2024-04-18T12:00:00Z' },
  { id:'EXP-0013', expense_category_name:'Travel & Conveyance',   amount:4200,  expense_date:'2024-05-05', file_number:'FILE-015',created_by_name:'Suresh Mehta',  remarks:'Outstation visit — Bhavnagar branch',     created_at:'2024-05-05T08:00:00Z' },
  { id:'EXP-0014', expense_category_name:'Internet & Phone',      amount:1499,  expense_date:'2024-05-10', file_number:'',        created_by_name:'Meena Shah',    remarks:'Monthly broadband + mobile recharge',     created_at:'2024-05-10T10:00:00Z' },
  { id:'EXP-0015', expense_category_name:'Printing & Stationery', amount:2100,  expense_date:'2024-05-22', file_number:'FILE-016',created_by_name:'Ravi Patel',   remarks:'Agreement paper and bond printing',       created_at:'2024-05-22T11:30:00Z' },
]

// ── Sub-components ────────────────────────────────────────────────────────────
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
export default function ExpensesPage() {
  const [rows,           setRows]           = useState<Expense[]>(mockExpenses)
  const [search,         setSearch]         = useState('')
  const [selected,       setSelected]       = useState<Expense | null>(null)
  const [filterCategory, setFilterCategory] = useState('All')

  // Modal states
  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form,     setForm]     = useState<Omit<Expense,'id'|'created_at'>>(emptyForm())

  const categories = ['All', ...CATEGORIES]

  const filtered = rows.filter(e => {
    const q = search.toLowerCase()
    const matchSearch =
      e.id.toLowerCase().includes(q)                     ||
      e.expense_category_name.toLowerCase().includes(q)  ||
      e.created_by_name.toLowerCase().includes(q)        ||
      e.file_number.toLowerCase().includes(q)             ||
      e.remarks.toLowerCase().includes(q)
    const matchCat = filterCategory === 'All' || e.expense_category_name === filterCategory
    return matchSearch && matchCat
  })

  // ── Handlers ──
  const handleAdd = () => {
    // POST /api/expenses  →  body: form fields
    // Note: expense_category_id, file_id, created_by must be resolved by backend from names/session
    const newRow: Expense = {
      id: `EXP-${String(rows.length + 1).padStart(4,'0')}`,
      created_at: new Date().toISOString(),
      ...form,
    }
    setRows(prev => [newRow, ...prev])
    setForm(emptyForm())
    setAddOpen(false)
  }

  const openEdit = (e: Expense) => {
    const { id: _id, created_at: _ca, ...rest } = e
    setForm(rest)
    setEditOpen(true)
  }

  const handleEdit = () => {
    // PATCH /api/expenses/:id  →  body: form fields
    setRows(prev => prev.map(e => e.id === selected!.id ? { ...e, ...form } : e))
    setSelected(prev => prev ? { ...prev, ...form } : prev)
    setEditOpen(false)
  }

  const handleDelete = (id: string) => {
    // ─── SOFT DELETE — BACKEND ACTION REQUIRED ────────────────────────────────
    // Before uncommenting: add this column to DB:
    //   ALTER TABLE expense_ledger ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    // API call: PATCH /api/expenses/:id  →  body: { is_deleted: true }
    //
    // setRows(prev => prev.filter(e => e.id !== id))
    // setSelected(null)
    // ─────────────────────────────────────────────────────────────────────────
    alert(`Soft delete pending. Backend needs: ALTER TABLE expense_ledger ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;\n\nID to delete: ${id}`)
  }

  const f = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: key === 'amount' ? Number(e.target.value) : e.target.value }))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:20 }}>

      {/* Category filter pills */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', padding:'12px 16px', boxShadow:'var(--shadow-sm)' }}>
        <span style={{ fontSize:'.78rem', fontWeight:700, color:'var(--gray-500)', marginRight:4, textTransform:'uppercase', letterSpacing:'.5px' }}>Category</span>
        {categories.map(cat => {
          const isActive = filterCategory === cat
          const cc = categoryColor(cat)
          return (
            <button key={cat} id={`expense-filter-${cat.replace(/\s+/g,'-').toLowerCase()}`}
              onClick={() => setFilterCategory(cat)}
              style={{ padding:'5px 13px', borderRadius:'var(--radius-full)', fontSize:'.78rem', fontWeight:600, cursor:'pointer', transition:'all .15s', border: isActive ? '1.5px solid transparent' : '1.5px solid var(--gray-200)', background: isActive ? (cat==='All' ? 'var(--brand-600)' : cc.bg) : '#fff', color: isActive ? (cat==='All' ? '#fff' : cc.color) : 'var(--gray-600)' }}>
              {cat}
            </button>
          )
        })}
      </div>

      {/* Main area */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, minHeight:0, flex:1 }}>

        {/* Table */}
        <div style={{ background:'#fff', border:'1px solid var(--gray-100)', borderRadius:'var(--radius-md)', boxShadow:'var(--shadow-sm)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--gray-100)', gap:12, flexWrap:'wrap' }}>
            <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--gray-900)' }}>
              All Expenses
              <span style={{ marginLeft:8, fontSize:'.75rem', color:'var(--gray-400)', fontWeight:500 }}>{filtered.length} records</span>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--gray-400)' }} />
                <input id="expense-search" placeholder="Search by ID, category, staff…" value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding:'8px 12px 8px 32px', border:'1.5px solid var(--gray-200)', borderRadius:8, fontSize:'.85rem', outline:'none', fontFamily:'inherit', width:220 }}
                  onFocus={e => (e.target.style.borderColor='var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor='var(--gray-200)')} />
              </div>
              <button id="expense-add-btn" onClick={() => { setForm(emptyForm()); setAddOpen(true) }}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:'var(--radius-sm)', background:'var(--brand-600)', color:'#fff', fontSize:'.85rem', fontWeight:600, cursor:'pointer', border:'none', transition:'background .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-700)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-600)')}>
                <Plus size={15} /> Add Expense
              </button>
            </div>
          </div>

          <div style={{ overflowY:'auto', flex:1 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.84rem' }}>
              <thead style={{ position:'sticky', top:0 }}>
                <tr>
                  {['Expense ID','Category','Amount','Date','File Linked','Recorded By'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--gray-500)', background:'var(--surface-1)', borderBottom:'1px solid var(--gray-100)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No expenses match your search.</td></tr>
                ) : filtered.map(row => {
                  const isSelected = selected?.id === row.id
                  const cc = categoryColor(row.expense_category_name)
                  return (
                    <tr key={row.id} id={`expense-row-${row.id}`} onClick={() => setSelected(isSelected ? null : row)}
                      style={{ cursor:'pointer', background: isSelected ? 'var(--brand-50)' : 'transparent', borderLeft: isSelected ? '3px solid var(--brand-500)' : '3px solid transparent', transition:'background .15s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='var(--surface-1)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background='transparent' }}>
                      <td style={{ padding:'12px 14px', color:'var(--brand-700)', fontWeight:600, fontSize:'.82rem' }}>{row.id}</td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:'var(--radius-full)', fontSize:'.75rem', fontWeight:600, background:cc.bg, color:cc.color }}>
                          <Tag size={10} />{row.expense_category_name}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px', fontWeight:700, color:'var(--gray-900)' }}>{fmt(row.amount)}</td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-600)' }}>{row.expense_date}</td>
                      <td style={{ padding:'12px 14px' }}>
                        {row.file_number
                          ? <span style={{ color:'var(--brand-600)', fontWeight:600 }}>{row.file_number}</span>
                          : <span style={{ color:'var(--gray-300)', fontSize:'.8rem' }}>—</span>}
                      </td>
                      <td style={{ padding:'12px 14px', color:'var(--gray-700)' }}>{row.created_by_name}</td>
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
                  <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.6)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Expense Detail</div>
                  <div style={{ fontSize:'1rem', fontWeight:700, color:'#fff', marginTop:2 }}>{selected.id}</div>
                </div>
                <button id="close-expense-detail" onClick={() => setSelected(null)}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'none' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.25)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.15)')}>
                  <X size={14} />
                </button>
              </div>

              <div style={{ padding:'18px', display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid var(--gray-100)' }}>
                <div style={{ width:54, height:54, borderRadius:'50%', background:categoryColor(selected.expense_category_name).bg, color:categoryColor(selected.expense_category_name).color, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                  <Wallet size={22} />
                </div>
                <div style={{ fontWeight:700, fontSize:'.95rem', color:'var(--gray-900)', textAlign:'center' }}>{selected.expense_category_name}</div>
                <div style={{ fontSize:'.78rem', color:'var(--gray-400)', marginTop:2 }}>Recorded by {selected.created_by_name}</div>
                <div style={{ marginTop:12, padding:'8px 20px', background:'var(--brand-50)', borderRadius:'var(--radius-md)', textAlign:'center' }}>
                  <div style={{ fontSize:'.7rem', color:'var(--brand-600)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.5px' }}>Amount Spent</div>
                  <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--brand-700)' }}>{fmt(selected.amount)}</div>
                </div>

                {/* Edit & Delete */}
                <div style={{ display:'flex', gap:8, marginTop:14 }}>
                  <button id={`expense-edit-${selected.id}`} onClick={() => openEdit(selected)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid var(--brand-200)', background:'var(--brand-50)', color:'var(--brand-700)', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-100)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='var(--brand-50)')}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button id={`expense-delete-${selected.id}`} onClick={() => handleDelete(selected.id)}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:'var(--radius-sm)', border:'1.5px solid #fee2e2', background:'#fff5f5', color:'#b91c1c', fontSize:'.8rem', fontWeight:600, cursor:'pointer', transition:'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background='#fee2e2')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background='#fff5f5')}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              <div style={{ padding:'4px 18px 16px', overflowY:'auto', flex:1 }}>
                <DetailRow icon={<Hash      size={14}/>} label="Expense ID"    value={selected.id} />
                <DetailRow icon={<Tag       size={14}/>} label="Category"      value={selected.expense_category_name} />
                <DetailRow icon={<Banknote  size={14}/>} label="Amount"        value={`₹${selected.amount.toLocaleString('en-IN')}`} />
                <DetailRow icon={<Calendar  size={14}/>} label="Expense Date"  value={selected.expense_date} />
                <DetailRow icon={<FileText  size={14}/>} label="Linked File"   value={selected.file_number || '—'} />
                <DetailRow icon={<User      size={14}/>} label="Recorded By"   value={selected.created_by_name} />
                <DetailRow icon={<Calendar  size={14}/>} label="Recorded At"   value={new Date(selected.created_at).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })} />
                <DetailRow icon={<AlignLeft size={14}/>} label="Remarks"       value={selected.remarks} />
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'var(--gray-300)' }}>
              <Wallet size={52} strokeWidth={1.2} />
              <div style={{ marginTop:14, fontSize:'.9rem', fontWeight:600, color:'var(--gray-400)' }}>Select an expense</div>
              <div style={{ fontSize:'.8rem', color:'var(--gray-300)', marginTop:4 }}>Click any row to view full details here.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      <Modal open={addOpen} title="Add Expense" onClose={() => setAddOpen(false)} onSubmit={handleAdd} submitLabel="Add Expense">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="Category *">
              <select className="form-select" style={{ width:'100%' }} value={form.expense_category_name} onChange={f('expense_category_name')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (₹) *"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} placeholder="0" required /></FormField>
            <FormField label="Expense Date *"><input className="form-input" type="date" value={form.expense_date} onChange={f('expense_date')} required /></FormField>
            <FormField label="Linked File (optional)"><input className="form-input" value={form.file_number} onChange={f('file_number')} placeholder="FILE-001 or leave blank" /></FormField>
            <FormField label="Recorded By *"><input className="form-input" value={form.created_by_name} onChange={f('created_by_name')} placeholder="Staff name" required /></FormField>
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={editOpen} title={`Edit Expense — ${selected?.id}`} onClose={() => setEditOpen(false)} onSubmit={handleEdit} submitLabel="Save Changes">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormField label="Category">
              <select className="form-select" style={{ width:'100%' }} value={form.expense_category_name} onChange={f('expense_category_name')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Amount (₹)"><input className="form-input" type="number" value={form.amount || ''} onChange={f('amount')} /></FormField>
            <FormField label="Expense Date"><input className="form-input" type="date" value={form.expense_date} onChange={f('expense_date')} /></FormField>
            <FormField label="Linked File"><input className="form-input" value={form.file_number} onChange={f('file_number')} /></FormField>
            <FormField label="Recorded By"><input className="form-input" value={form.created_by_name} onChange={f('created_by_name')} /></FormField>
          </div>
          <FormField label="Remarks"><textarea className="form-input" rows={2} value={form.remarks} onChange={f('remarks')} style={{ resize:'vertical' }} /></FormField>
        </div>
      </Modal>
    </div>
  )
}
