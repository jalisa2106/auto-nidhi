import { useState } from 'react'
import {
  Users, Phone, MapPin, Search, Plus,
  Hash, Building2, Pencil, Trash2, X,
  Handshake, TrendingDown,
} from 'lucide-react'
import Modal from '../../components/app/Modal'
import { mockBrokers } from '../../lib/mockData'

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND INTEGRATION NOTES
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/brokers        → fetch all (SELECT * FROM master_broker WHERE is_deleted = FALSE)
// POST   /api/brokers        → create new master_broker record
// PATCH  /api/brokers/:id    → update broker details
// DELETE /api/brokers/:id    → soft delete (see handleDelete)
//
// DB Table: master_broker
//   id          UUID PK
//   broker_name VARCHAR(255) NOT NULL
//   area        VARCHAR(100)
//   district    VARCHAR(100)
//   phone       VARCHAR(15) UNIQUE
// ─────────────────────────────────────────────────────────────────────────────

interface Broker {
  id          : string  // master_broker.id
  broker_name : string  // master_broker.broker_name
  area        : string  // master_broker.area
  district    : string  // master_broker.district
  phone       : string  // master_broker.phone
}

const emptyForm = (): Omit<Broker, 'id'> => ({
  broker_name: '', area: '', district: '', phone: '',
})

const fmt = (n: number) =>
  '₹' + (n >= 100000 ? (n / 100000).toFixed(1) + 'L' : n.toLocaleString('en-IN'))

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, iconBg, iconColor, accent }: {
  icon: React.ReactNode; label: string; value: string | number
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
export default function BrokersPage() {
  const [rows,     setRows]     = useState<Broker[]>(mockBrokers)
  const [search,   setSearch]   = useState('')
  const [addOpen,  setAddOpen]  = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId,   setEditId]   = useState<string | null>(null)
  const [form,     setForm]     = useState<Omit<Broker, 'id'>>(emptyForm())
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (
      r.broker_name.toLowerCase().includes(q) ||
      r.area.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.phone.includes(q)
    )
  })

  // Stats
  const totalBrokers   = rows.length
  const districtCount  = new Set(rows.map(r => r.district).filter(Boolean)).size
  const areaCount      = new Set(rows.map(r => r.area).filter(Boolean)).size

  // ── Validation ──
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.broker_name.trim()) e.broker_name = 'Broker name is required'
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) e.phone = 'Phone must be 10 digits'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Handlers ──
  const handleAdd = () => {
    if (!validate()) return
    // POST /api/brokers  →  body: { broker_name, area, district, phone }
    const newRow: Broker = { id: `B${String(rows.length + 1).padStart(3, '0')}`, ...form }
    setRows(prev => [newRow, ...prev])
    setForm(emptyForm())
    setErrors({})
    setAddOpen(false)
  }

  const openEdit = (r: Broker) => {
    const { id, ...rest } = r
    setEditId(id)
    setForm(rest)
    setErrors({})
    setEditOpen(true)
  }

  const handleEdit = () => {
    if (!validate()) return
    // PATCH /api/brokers/:id  →  body: { broker_name, area, district, phone }
    setRows(prev => prev.map(r => r.id === editId ? { ...r, ...form } : r))
    setEditOpen(false)
    setEditId(null)
  }

  const handleDelete = (id: string) => {
    // ─── SOFT DELETE — BACKEND ACTION REQUIRED ────────────────────────────────
    // Before uncommenting: add this column to DB:
    //   ALTER TABLE master_broker ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
    // API call: PATCH /api/brokers/:id  →  body: { is_deleted: true }
    //
    // setRows(prev => prev.filter(r => r.id !== id))
    // ─────────────────────────────────────────────────────────────────────────
    alert(`Soft delete pending backend column.\nBroker ID: ${id}\n\nRequired: ALTER TABLE master_broker ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;`)
  }

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard icon={<Handshake size={20} />}   label="Total Brokers"       value={totalBrokers}  iconBg="#eff6ff" iconColor="#1d4ed8" accent="#1d4ed8" />
        <StatCard icon={<MapPin size={20} />}       label="Districts Covered"   value={districtCount} iconBg="#f0fdf4" iconColor="#15803d" accent="#15803d" />
        <StatCard icon={<TrendingDown size={20} />} label="Areas Represented"   value={areaCount}     iconBg="#fef3c7" iconColor="#92400e" />
      </div>

      {/* Table card */}
      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--gray-900)' }}>
            All Brokers
            <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>{filtered.length} records</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
              <input
                id="broker-search"
                placeholder="Search name, area, district…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '.85rem', outline: 'none', fontFamily: 'inherit', width: 240 }}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--gray-200)')}
              />
            </div>
            <button
              id="broker-add-btn"
              onClick={() => { setForm(emptyForm()); setErrors({}); setAddOpen(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-600)', color: '#fff', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'background .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-700)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-600)')}>
              <Plus size={15} /> Add Broker
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                {['ID', 'Broker Name', 'Area', 'District', 'Phone', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray-500)', background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No brokers match your search.</td></tr>
              ) : filtered.map(row => (
                <tr key={row.id}
                  style={{ borderBottom: '1px solid var(--gray-50)', transition: 'background .12s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-1)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}>
                  <td style={{ padding: '12px 14px', color: 'var(--brand-700)', fontWeight: 600, fontSize: '.8rem', fontFamily: 'monospace' }}>{row.id}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--brand-500),var(--brand-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, flexShrink: 0 }}>
                        {row.broker_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{row.broker_name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--gray-600)' }}>
                    {row.area ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} style={{ color: 'var(--gray-400)' }} />{row.area}</span> : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--gray-700)' }}>{row.district || '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--gray-600)', fontFamily: 'monospace', fontSize: '.82rem' }}>
                    {row.phone ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Phone size={12} style={{ color: 'var(--gray-400)' }} />{row.phone}</span> : '—'}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        id={`broker-edit-${row.id}`}
                        onClick={() => openEdit(row)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-100)')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-50)')}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        id={`broker-delete-${row.id}`}
                        onClick={() => handleDelete(row.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#b91c1c', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fee2e2')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = '#fff5f5')}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Modal ── */}
      <Modal open={addOpen} title="Add Broker" onClose={() => { setAddOpen(false); setErrors({}) }} onSubmit={handleAdd} submitLabel="Add Broker" maxWidth="560px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Broker Name *" error={errors.broker_name}>
              <input id="broker-add-name" className={`form-input ${errors.broker_name ? 'error' : ''}`} value={form.broker_name} onChange={f('broker_name')} placeholder="e.g. S. Joshi Associates" required />
            </FormField>
          </div>
          <FormField label="Area" error={errors.area}>
            <input id="broker-add-area" className="form-input" value={form.area} onChange={f('area')} placeholder="e.g. Kothrud" />
          </FormField>
          <FormField label="District" error={errors.district}>
            <input id="broker-add-district" className="form-input" value={form.district} onChange={f('district')} placeholder="e.g. Pune" />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Phone" error={errors.phone}>
              <input id="broker-add-phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={f('phone')} placeholder="10-digit mobile number" maxLength={10} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal open={editOpen} title="Edit Broker" onClose={() => { setEditOpen(false); setErrors({}) }} onSubmit={handleEdit} submitLabel="Save Changes" maxWidth="560px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Broker Name *" error={errors.broker_name}>
              <input id="broker-edit-name" className={`form-input ${errors.broker_name ? 'error' : ''}`} value={form.broker_name} onChange={f('broker_name')} required />
            </FormField>
          </div>
          <FormField label="Area" error={errors.area}>
            <input id="broker-edit-area" className="form-input" value={form.area} onChange={f('area')} />
          </FormField>
          <FormField label="District" error={errors.district}>
            <input id="broker-edit-district" className="form-input" value={form.district} onChange={f('district')} />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Phone" error={errors.phone}>
              <input id="broker-edit-phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={f('phone')} maxLength={10} />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}
