import { useEffect, useState } from 'react'
import {
  TrendingDown, TrendingUp, Clock,
  Search, Plus, X, Pencil, Trash2,
  Hash, Calendar, Banknote, AlignLeft,
  CreditCard, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import Modal from '../../components/app/Modal'
import { advancesApi, brokersApi, dealersApi } from '../../api/services'

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/advances        → fetch all (JOIN query below)
// POST   /api/advances        → create new record
// PATCH  /api/advances/:id    → update amount_recovered + remarks only
// DELETE /api/advances/:id    → soft delete (see handleDelete)
//
// DB query:
//   SELECT a.*,
//     COALESCE(d.dealer_name, b.broker_name) AS party_name,
//     CASE WHEN d.id IS NOT NULL THEN 'dealer' ELSE 'broker' END AS party_type
//   FROM advances a
//   LEFT JOIN master_dealer d ON d.id = a.dealer_id
//   LEFT JOIN master_broker b ON b.id = a.broker_id
//   ORDER BY a.advance_date DESC
//
// party_type enum (DB): 'dealer' | 'broker'
// recovery_status enum: 'pending' | 'partial' | 'fully_recovered'
// payment_mode enum:    'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'
// ─────────────────────────────────────────────────────────────────────────────

interface Advance {
  id                : string   // advances.id (UUID)
  dealer_id         : string | null  // advances.dealer_id (FK → master_dealer)
  broker_id         : string | null  // advances.broker_id (FK → master_broker)
  party_type        : 'dealer' | 'broker'  // derived from which FK is set
  party_name        : string   // joined from master_dealer.dealer_name OR master_broker.broker_name
  advance_date      : string   // advances.advance_date
  amount            : number   // advances.amount
  mode              : 'cash' | 'cheque' | 'rtgs' | 'neft' | 'imps' | 'upi'  // advances.mode
  utr_cheque_number : string   // advances.utr_cheque_number
  purpose           : string   // advances.purpose
  recovery_status   : 'pending' | 'partial' | 'fully_recovered'  // advances.recovery_status
  amount_recovered  : number   // advances.amount_recovered
  remarks           : string   // advances.remarks
}

interface Broker {
  id: string
  broker_name: string
  area?: string
  district?: string
  phone?: string
}

interface Dealer {
  id: string
  name: string
  city?: string
  phone?: string
  email?: string
}

type PartyType = 'dealer' | 'broker'
type Mode = Advance['mode']
type RecoveryStatus = Advance['recovery_status']

const MODES: Mode[] = ['cash', 'cheque', 'rtgs', 'neft', 'imps', 'upi']

const emptyForm = () => ({
  party_type        : 'broker' as PartyType,
  dealer_id         : '',
  broker_id         : '',
  advance_date      : '',
  amount            : 0,
  mode              : 'cash' as Mode,
  utr_cheque_number : '',
  purpose           : '',
  recovery_status   : 'pending' as RecoveryStatus,
  amount_recovered  : 0,
  remarks           : '',
})

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

const statusMeta: Record<RecoveryStatus, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pending          : { label: 'Pending',         bg: '#fef3c7', color: '#92400e', icon: <Clock size={12} /> },
  partial          : { label: 'Partial',          bg: '#dbeafe', color: '#1d4ed8', icon: <RefreshCw size={12} /> },
  fully_recovered  : { label: 'Fully Recovered',  bg: '#dcfce7', color: '#15803d', icon: <CheckCircle2 size={12} /> },
}

const modeBadgeBg: Record<Mode, string> = {
  cash: '#dcfce7', cheque: '#fef3c7', rtgs: '#ede9fe',
  neft: '#dbeafe', imps: '#fce7f3', upi: '#f0fdf4',
}
const modeBadgeColor: Record<Mode, string> = {
  cash: '#15803d', cheque: '#92400e', rtgs: '#6d28d9',
  neft: '#1d4ed8', imps: '#9d174d', upi: '#166534',
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, iconBg, iconColor, accent }: {
  icon: React.ReactNode; label: string; value: string
  iconBg: string; iconColor: string; accent?: string
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 14, transition: 'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';    (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: accent || 'var(--gray-900)', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ color: 'var(--brand-500)', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
        <div style={{ fontSize: '.9rem', color: 'var(--gray-800)', fontWeight: 500, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  )
}

function FormField({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdvancesPage() {
  const [rows, setRows] = useState<Advance[]>([])
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(false)

  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState<Advance | null>(null)

  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [form,     setForm]     = useState(emptyForm())
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  // Stats
  const totalAmount    = rows.reduce((s, r) => s + r.amount, 0)
  const totalRecovered = rows.reduce((s, r) => s + r.amount_recovered, 0)
  const totalPending   = totalAmount - totalRecovered

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (
      r.id.toLowerCase().includes(q) ||
      r.party_name.toLowerCase().includes(q) ||
      r.party_type.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q) ||
      r.recovery_status.toLowerCase().includes(q)
    )
  })

  const loadAdvances = async () => {
    setLoading(true)
    try {
      const data = await advancesApi.list()
      setRows(data)
    } catch (err) {
      console.error('Failed to load advances', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBrokers = async () => {
    try {
      const data = await brokersApi.list()
      setBrokers(data)
    } catch (err) {
      console.error('Failed to load brokers', err)
    }
  }

  const loadDealers = async () => {
    try {
      const data = await dealersApi.list()
      setDealers(data)
    } catch (err) {
      console.error('Failed to load dealers', err)
    }
  }

  useEffect(() => {
    loadAdvances()
    loadBrokers()
    loadDealers()
  }, [])

  // ── Validation ──
  const validate = (isEdit = false) => {
    const e: Record<string, string> = {}
    if (!isEdit) {
      if (form.party_type === 'dealer' && !form.dealer_id) e.dealer_id = 'Select a dealer'
      if (form.party_type === 'broker' && !form.broker_id) e.broker_id = 'Select a broker'
      if (!form.advance_date) e.advance_date = 'Date is required'
      if (!form.amount || form.amount <= 0) e.amount = 'Enter a valid amount'
      if (form.mode === 'cheque' && !form.utr_cheque_number.trim()) e.utr_cheque_number = 'Cheque number is required'
      if (['upi', 'neft', 'rtgs', 'imps'].includes(form.mode) && !form.utr_cheque_number.trim()) e.utr_cheque_number = 'UTR / reference number is required'
    }
    if (form.amount_recovered < 0) e.amount_recovered = 'Cannot be negative'
    if (selected && form.amount_recovered > selected.amount) e.amount_recovered = 'Cannot exceed advance amount'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Handlers ──
  const handleAdd = async () => {
    if (!validate(false)) return

    try {
      const created = await advancesApi.create({
        dealer_id: form.party_type === 'dealer' ? form.dealer_id : null,
        broker_id: form.party_type === 'broker' ? form.broker_id : null,
        advance_date: form.advance_date,
        amount: form.amount,
        mode: form.mode,
        utr_cheque_number: form.utr_cheque_number,
        purpose: form.purpose,
        remarks: form.remarks,
      })

      setRows(prev => [created, ...prev])
      setForm(emptyForm())
      setErrors({})
      setAddOpen(false)
    } catch (err) {
      console.error('Failed to create advance', err)
    }
  }

  const openEdit = (r: Advance) => {
    setForm({
      party_type        : r.party_type,
      dealer_id         : r.dealer_id || '',
      broker_id         : r.broker_id || '',
      advance_date      : r.advance_date,
      amount            : r.amount,
      mode              : r.mode,
      utr_cheque_number : r.utr_cheque_number,
      purpose           : r.purpose,
      recovery_status   : r.recovery_status,
      amount_recovered  : r.amount_recovered,
      remarks           : r.remarks,
    })
    setErrors({})
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!validate(true) || !selected) return

    try {
      const updated = await advancesApi.update(selected.id, {
        amount_recovered: form.amount_recovered,
        remarks: form.remarks,
      })

      setRows(prev => prev.map(r => r.id === selected.id ? updated : r))
      setSelected(updated)
      setEditOpen(false)
    } catch (err) {
      console.error('Failed to update advance', err)
    }
  }

  // const handleDelete = (id: string) => {
  //   // ─── SOFT DELETE — BACKEND ACTION REQUIRED ────────────────────────────────
  //   // Before uncommenting: add this column to DB:
  //   //   ALTER TABLE advances ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
  //   // API call: PATCH /api/advances/:id  →  body: { is_deleted: true }
  //   //
  //   // setRows(prev => prev.filter(r => r.id !== id))
  //   // setSelected(null)
  //   // ─────────────────────────────────────────────────────────────────────────
  //   alert(`Soft delete pending backend column.\nAdvance ID: ${id}\n\nRequired: ALTER TABLE advances ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;`)
  // }

  const handleDelete = async (id: string) => {
    try {
      await advancesApi.remove(id)
      setRows(prev => prev.filter(r => r.id !== id))
      setSelected(null)
    } catch (err) {
      console.error('Failed to delete advance', err)
    }
  }

  const upd = (key: keyof typeof form, val: string | number) => {
    setForm(prev => ({ ...prev, [key]: val }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard icon={<TrendingDown size={20} />} label="Total Advanced"    value={fmt(totalAmount)}    iconBg="#eff6ff" iconColor="#1d4ed8" accent="#1d4ed8" />
        <StatCard icon={<TrendingUp size={20} />}   label="Total Recovered"   value={fmt(totalRecovered)} iconBg="#dcfce7" iconColor="#15803d" accent="#15803d" />
        <StatCard icon={<AlertCircle size={20} />}  label="Outstanding"       value={fmt(totalPending)}   iconBg="#fef3c7" iconColor="#b45309" accent={totalPending > 0 ? '#b91c1c' : '#15803d'} />
      </div>

      {/* Main split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, minHeight: 0, flex: 1 }}>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-900)' }}>
              All Advances
              <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>{filtered.length} records</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
                <input
                  id="advance-search"
                  placeholder="Search by party, purpose…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '.85rem', outline: 'none', fontFamily: 'inherit', width: 220 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                  onBlur={e  => (e.target.style.borderColor = 'var(--gray-200)')}
                />
              </div>
              <button
                id="advance-add-btn"
                onClick={() => { setForm(emptyForm()); setErrors({}); setAddOpen(true) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-600)', color: '#fff', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'background .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-700)')}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-600)')}>
                <Plus size={15} /> Add Advance
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  {['ID', 'Party', 'Date', 'Amount', 'Mode', 'Recovered', 'Status'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray-500)', background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>Loading advances...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No advances match your search.</td></tr>
                ) : filtered.map(row => {
                  const isSelected = selected?.id === row.id
                  const sm = statusMeta[row.recovery_status]
                  return (
                    <tr key={row.id} id={`advance-row-${row.id}`}
                      onClick={() => setSelected(isSelected ? null : row)}
                      style={{ cursor: 'pointer', background: isSelected ? 'var(--brand-50)' : 'transparent', borderLeft: isSelected ? '3px solid var(--brand-500)' : '3px solid transparent', transition: 'background .15s' }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-1)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>
                      <td style={{ padding: '12px 14px', color: 'var(--brand-700)', fontWeight: 600, fontSize: '.8rem' }}>{row.id}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--gray-900)', fontSize: '.85rem' }}>{row.party_name}</div>
                        <div style={{ fontSize: '.72rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{row.party_type}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--gray-600)', fontSize: '.83rem' }}>{row.advance_date}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--gray-900)' }}>{fmt(row.amount)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', background: modeBadgeBg[row.mode], color: modeBadgeColor[row.mode] }}>{row.mode}</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontWeight: 600, color: row.amount_recovered > 0 ? '#15803d' : 'var(--gray-400)' }}>{fmt(row.amount_recovered)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius-full)', fontSize: '.72rem', fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.icon}{sm.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selected ? (
            <>
              {/* Panel header */}
              <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, var(--brand-800), var(--brand-900))' }}>
                <div>
                  <div style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Advance Detail</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>{selected.id}</div>
                </div>
                <button id="close-advance-detail" onClick={() => setSelected(null)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,.15)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.25)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,.15)')}>
                  <X size={14} />
                </button>
              </div>

              {/* Party avatar + amounts */}
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, marginBottom: 10, boxShadow: '0 4px 12px rgba(37,99,235,.25)' }}>
                  {selected.party_name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{selected.party_name}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--gray-400)', marginTop: 2, textTransform: 'capitalize' }}>{selected.party_type}</div>

                {/* Amount breakdown */}
                <div style={{ width: '100%', marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '8px 10px', background: '#eff6ff', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase' }}>Advanced</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8' }}>{fmt(selected.amount)}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#dcfce7', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: '.68rem', color: '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Recovered</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d' }}>{fmt(selected.amount_recovered)}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: selected.amount - selected.amount_recovered > 0 ? '#fef3c7' : '#dcfce7', borderRadius: 8, textAlign: 'center', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '.68rem', color: selected.amount - selected.amount_recovered > 0 ? '#92400e' : '#15803d', fontWeight: 600, textTransform: 'uppercase' }}>Pending</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: selected.amount - selected.amount_recovered > 0 ? '#b91c1c' : '#15803d' }}>
                      {fmt(selected.amount - selected.amount_recovered)}
                    </div>
                  </div>
                </div>

                {/* Status badge */}
                <div style={{ marginTop: 10 }}>
                  {(() => { const sm = statusMeta[selected.recovery_status]; return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '.78rem', fontWeight: 700, background: sm.bg, color: sm.color }}>
                      {sm.icon}{sm.label}
                    </span>
                  )})()}
                </div>

                {/* Edit + Delete */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button id={`advance-edit-${selected.id}`} onClick={() => openEdit(selected)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-100)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-50)')}>
                    <Pencil size={13} /> Edit Recovery
                  </button>
                  <button id={`advance-delete-${selected.id}`} onClick={() => handleDelete(selected.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#b91c1c', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fee2e2')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fff5f5')}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>

              {/* Detail rows */}
              <div style={{ padding: '4px 18px 16px', overflowY: 'auto', flex: 1 }}>
                <DetailRow icon={<Hash size={14} />}       label="Advance ID"         value={selected.id} />
                <DetailRow icon={<Calendar size={14} />}   label="Advance Date"       value={selected.advance_date} />
                <DetailRow icon={<CreditCard size={14} />} label="Payment Mode"       value={<span style={{ textTransform: 'uppercase' }}>{selected.mode}</span>} />
                <DetailRow icon={<Hash size={14} />}       label="UTR / Cheque No."   value={selected.utr_cheque_number || '—'} />
                <DetailRow icon={<Banknote size={14} />}   label="Amount"             value={`₹${selected.amount.toLocaleString('en-IN')}`} />
                <DetailRow icon={<TrendingUp size={14} />} label="Amount Recovered"   value={`₹${selected.amount_recovered.toLocaleString('en-IN')}`} />
                <DetailRow icon={<AlignLeft size={14} />}  label="Purpose"            value={selected.purpose || '—'} />
                <DetailRow icon={<AlignLeft size={14} />}  label="Remarks"            value={selected.remarks || '—'} />
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', color: 'var(--gray-300)' }}>
              <TrendingDown size={52} strokeWidth={1.2} />
              <div style={{ marginTop: 14, fontSize: '.9rem', fontWeight: 600, color: 'var(--gray-400)' }}>Select an advance</div>
              <div style={{ fontSize: '.8rem', color: 'var(--gray-300)', marginTop: 4 }}>Click any row to view full details here.</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      <Modal open={addOpen} title="Add Advance" onClose={() => { setAddOpen(false); setErrors({}) }} onSubmit={handleAdd} submitLabel="Add Advance" maxWidth="680px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Party Type */}
          <FormField label="Party Type *">
            <select id="advance-add-party-type" className="form-select" style={{ width: '100%' }}
              value={form.party_type}
              onChange={e => { upd('party_type', e.target.value as PartyType); upd('dealer_id', ''); upd('broker_id', '') }}>
              <option value="dealer">Dealer</option>
              <option value="broker">Broker</option>
            </select>
          </FormField>

          {/* Dynamic party selector */}
          {form.party_type === 'dealer' ? (
            <FormField label="Dealer *" error={errors.dealer_id}>
              <select id="advance-add-dealer" className={`form-input ${errors.dealer_id ? 'error' : ''}`} style={{ width: '100%' }}
                value={form.dealer_id} onChange={e => upd('dealer_id', e.target.value)}>
                <option value="">Select dealer…</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.name} — {d.city}</option>)}
              </select>
            </FormField>
          ) : (
            <FormField label="Broker *" error={errors.broker_id}>
              <select id="advance-add-broker" className={`form-input ${errors.broker_id ? 'error' : ''}`} style={{ width: '100%' }}
                value={form.broker_id} onChange={e => upd('broker_id', e.target.value)}>
                <option value="">Select broker…</option>
                {brokers.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.broker_name} — {b.district}
                  </option>
                ))}
              </select>
            </FormField>
          )}

          <FormField label="Advance Date *" error={errors.advance_date}>
            <input id="advance-add-date" className={`form-input ${errors.advance_date ? 'error' : ''}`} type="date"
              value={form.advance_date} onChange={e => upd('advance_date', e.target.value)} required />
          </FormField>

          <FormField label="Amount (₹) *" error={errors.amount}>
            <input id="advance-add-amount" className={`form-input ${errors.amount ? 'error' : ''}`} type="number" min="1"
              value={form.amount || ''} onChange={e => upd('amount', Number(e.target.value))} placeholder="0" required />
          </FormField>

          <FormField label="Payment Mode *">
            <select id="advance-add-mode" className="form-select" style={{ width: '100%' }}
              value={form.mode}
              onChange={e => { upd('mode', e.target.value as Mode); upd('utr_cheque_number', '') }}>
              {MODES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </FormField>

          {/* Cheque — cheque number required */}
          {form.mode === 'cheque' && (
            <FormField label="Cheque No. *" error={errors.utr_cheque_number}>
              <input
                id="advance-add-cheque-no"
                className={`form-input ${errors.utr_cheque_number ? 'error' : ''}`}
                value={form.utr_cheque_number}
                onChange={e => upd('utr_cheque_number', e.target.value)}
                placeholder="e.g. CHQ001234"
                required
              />
            </FormField>
          )}

          {/* Online (UPI / NEFT / RTGS / IMPS) — UTR required */}
          {['upi', 'neft', 'rtgs', 'imps'].includes(form.mode) && (
            <FormField label="UTR / Ref No. *" error={errors.utr_cheque_number}>
              <input
                id="advance-add-utr"
                className={`form-input ${errors.utr_cheque_number ? 'error' : ''}`}
                value={form.utr_cheque_number}
                onChange={e => upd('utr_cheque_number', e.target.value)}
                placeholder="e.g. NFT202510220089"
                required
              />
            </FormField>
          )}

          {/* Cash — no extra field needed */}

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Purpose">
              <input id="advance-add-purpose" className="form-input" value={form.purpose}
                onChange={e => upd('purpose', e.target.value)} placeholder="Reason for advance" />
            </FormField>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Remarks">
              <textarea id="advance-add-remarks" className="form-input" rows={2} value={form.remarks}
                onChange={e => upd('remarks', e.target.value)} style={{ resize: 'vertical' }} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal (recovery only) ── */}
      <Modal open={editOpen} title={`Update Recovery — ${selected?.id}`} onClose={() => { setEditOpen(false); setErrors({}) }} onSubmit={handleEdit} submitLabel="Save Recovery" maxWidth="480px">
        <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--brand-50)', borderRadius: 8, border: '1px solid var(--brand-100)', fontSize: '.83rem', color: 'var(--brand-700)' }}>
          <strong>Total Advanced:</strong> {selected ? fmt(selected.amount) : '—'} &nbsp;|&nbsp; <strong>Previously Recovered:</strong> {selected ? fmt(selected.amount_recovered) : '—'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Amount Recovered (₹) *" error={errors.amount_recovered}>
            <input id="advance-edit-recovered" className={`form-input ${errors.amount_recovered ? 'error' : ''}`}
              type="number" min="0" max={selected?.amount}
              value={form.amount_recovered || ''}
              onChange={e => upd('amount_recovered', Number(e.target.value))} />
          </FormField>
          <FormField label="Remarks">
            <textarea id="advance-edit-remarks" className="form-input" rows={3}
              value={form.remarks} onChange={e => upd('remarks', e.target.value)} style={{ resize: 'vertical' }} />
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
