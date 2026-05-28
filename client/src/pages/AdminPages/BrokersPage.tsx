import { useEffect, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { message } from 'antd'
import { Phone, MapPin, Search, Plus, Pencil, Trash2, Handshake, TrendingDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Modal from '../../components/app/Modal'
import { brokersApi } from '../../api/services'

// ─── TYPES & CONTRACT BOUNDARIES ──────────────────────────────────────────
interface Broker {
  id: string
  broker_name: string
  area: string
  district: string
  phone: string
  status: 'Active' | 'Inactive'
}

const emptyForm = (): Omit<Broker, 'id'> => ({
  broker_name: '',
  area: '',
  district: '',
  phone: '',
  status: 'Active',
})

const normalizeBroker = (broker: Partial<Broker>): Broker => ({
  id: String(broker.id ?? ''),
  broker_name: String(broker.broker_name ?? '').trim(),
  area: String(broker.area ?? '').trim(),
  district: String(broker.district ?? '').trim(),
  phone: String(broker.phone ?? '').trim(),
  status: (broker.status as 'Active' | 'Inactive') || 'Active',
})

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatBrokerId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `BROKER-${id.slice(0, 8)}`
  return id
}

function StatCard({ icon, label, value, iconBg, iconColor, accent }: {
  icon: ReactNode
  label: string 
  value: string | number
  iconBg: string
  iconColor: string
  accent?: string
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', padding: '18px 20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: 14, transition: 'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: '.75rem', color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: accent || 'var(--gray-900)', lineHeight: 1.1, marginTop: 2 }}>{value}</div>
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

function FormField({ label, children, error, required }: { label: string; children: ReactNode; error?: string; required?: boolean }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  )
}

export default function BrokersPage() {
  const [rows, setRows] = useState<Broker[]>([])
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Broker, 'id'>>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const loadBrokers = async () => {
    try {
      const data = await brokersApi.list(search)
      setRows(Array.isArray(data) ? data.map(normalizeBroker) : [])
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to load brokers')
    }
  }

  useEffect(() => {
    void loadBrokers()
  }, [])

  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      row.broker_name.toLowerCase().includes(q) ||
      row.area.toLowerCase().includes(q) ||
      row.district.toLowerCase().includes(q) ||
      row.phone.includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const pageRows   = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const totalBrokers = rows.length
  const districtCount = new Set(rows.map(r => r.district).filter(Boolean)).size
  const areaCount = new Set(rows.map(r => r.area).filter(Boolean)).size

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.broker_name.trim()) nextErrors.broker_name = 'Broker name is required'
    if (!form.area.trim()) nextErrors.area = 'Area is required'
    if (!form.district.trim()) nextErrors.district = 'District is required'
    if (!form.phone.trim()) {
      nextErrors.phone = 'Phone is required'
    } else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) {
      nextErrors.phone = 'Phone must be exactly 10 digits'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleAdd = async () => {
    if (!validate()) return
    try {
      const created = await brokersApi.create(form)
      setRows(prev => [normalizeBroker(created), ...prev])
      setForm(emptyForm())
      setErrors({})
      setAddOpen(false)
      message.success('Broker added successfully')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to add broker')
    }
  }

  const openEdit = (row: Broker) => {
    const { id, ...rest } = row
    setEditId(id)
    setForm(rest)
    setErrors({})
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editId || !validate()) return
    try {
      const updated = await brokersApi.update(editId, form)
      setRows(prev => prev.map(row => row.id === editId ? normalizeBroker(updated) : row))
      setEditOpen(false)
      setEditId(null)
      setForm(emptyForm())
      message.success('Broker updated successfully')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to update broker')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this broker?')) return
    try {
      await brokersApi.remove(id)
      setRows(prev => prev.filter(row => row.id !== id))
      message.success('Broker deleted successfully')
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to delete broker')
    }
  }

  const f = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <StatCard icon={<Handshake size={20} />} label="Total Brokers" value={totalBrokers} iconBg="#eff6ff" iconColor="#1d4ed8" accent="#1d4ed8" />
        <StatCard icon={<MapPin size={20} />} label="Districts Covered" value={districtCount} iconBg="#f0fdf4" iconColor="#15803d" accent="#15803d" />
        <StatCard icon={<TrendingDown size={20} />} label="Areas Represented" value={areaCount} iconBg="#fef3c7" iconColor="#92400e" />
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                placeholder="Search name, area, district..."
                value={search}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1) }}
                style={{ padding: '8px 12px 8px 32px', border: '1.5px solid var(--gray-200)', borderRadius: 8, fontSize: '.85rem', outline: 'none', fontFamily: 'inherit', width: 240 }}
                onFocus={e => (e.target.style.borderColor = 'var(--brand-500)')}
                onBlur={e => (e.target.style.borderColor = 'var(--gray-200)')}
              />
            </div>
            <button
              id="broker-add-btn"
              type="button"
              onClick={() => { setForm(emptyForm()); setErrors({}); setAddOpen(true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--brand-600)', color: '#fff', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'background .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-700)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-600)')}>
              <Plus size={15} /> Add Broker
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.84rem' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr>
                {['#', 'ID', 'Broker Name', 'Area', 'District', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--gray-500)', background: 'var(--surface-1)', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No brokers found.</td></tr>
              ) : pageRows.map((row, i) => (
                <tr key={row.id}
                  style={{ borderBottom: '1px solid var(--gray-50)', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding:'11px 14px', color:'var(--gray-400)', fontSize:'.8rem' }}>{(safePage-1)*pageSize+i+1}</td>
                  <td title={row.id} style={{ padding: '12px 14px', color: 'var(--brand-700)', fontWeight: 600, fontSize: '.8rem', fontFamily: 'monospace' }}>{formatBrokerId(row.id)}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,var(--brand-500),var(--brand-700))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 800, flexShrink: 0 }}>
                        {(row.broker_name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{row.broker_name || 'Unnamed Broker'}</span>
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
                    <span className={`from-badge ${row.status === 'Active' ? 'from-dealer' : 'from-other'}`}>
                      {row.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        id={`broker-edit-${row.id}`}
                        type="button"
                        onClick={() => openEdit(row)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--brand-200)', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-100)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-50)')}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        id={`broker-delete-${row.id}`}
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1.5px solid #fee2e2', background: '#fff5f5', color: '#b91c1c', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fee2e2')}
                        onMouseLeave={e => (e.currentTarget.style.background = '#fff5f5')}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={filtered.length} page={safePage} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
      </div>

      <Modal open={addOpen} title="Add Broker" onClose={() => { setAddOpen(false); setErrors({}) }} onSubmit={handleAdd} submitLabel="Add Broker" maxWidth="560px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Broker Name" required={true} error={errors.broker_name}>
                <input className={`form-input ${errors.broker_name ? 'error' : ''}`} value={form.broker_name} onChange={f('broker_name')} />
            </FormField>
          </div>
          <FormField label="Area" required={true} error={errors.area}>
            <input id="broker-add-area" className={`form-input ${errors.area ? 'error' : ''}`} value={form.area} onChange={f('area')} placeholder="e.g. Kothrud" required />
          </FormField>
          <FormField label="District" required={true} error={errors.district}>
            <input id="broker-add-district" className={`form-input ${errors.district ? 'error' : ''}`} value={form.district} onChange={f('district')} placeholder="e.g. Pune" required />
          </FormField>
          <FormField label="Phone" required={true} error={errors.phone}>
            <input id="broker-add-phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={f('phone')} placeholder="10-digit mobile number" maxLength={10} required />
          </FormField>
          <FormField label="Network Status" required={true}>
            <select id="broker-add-status" className="form-input" value={form.status} onChange={f('status')}>
              <option value="Active">Active (Permit immediate sourcing)</option>
              <option value="Inactive">Inactive / On Hold</option>
            </select>
          </FormField>
        </div>
      </Modal>
 
      <Modal open={editOpen} title="Edit Broker" onClose={() => { setEditOpen(false); setErrors({}) }} onSubmit={handleEdit} submitLabel="Save Changes" maxWidth="650px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FormField label="Broker Name" required={true} error={errors.broker_name}>
              <input id="broker-edit-name" className={`form-input ${errors.broker_name ? 'error' : ''}`} value={form.broker_name} onChange={f('broker_name')} placeholder="e.g. S. Joshi Associates" required />
            </FormField>
          </div>
          <FormField label="Area" required={true} error={errors.area}>
            <input id="broker-edit-area" className={`form-input ${errors.area ? 'error' : ''}`} value={form.area} onChange={f('area')} placeholder="e.g. Kothrud" required />
          </FormField>
          <FormField label="District" required={true} error={errors.district}>
            <input id="broker-edit-district" className={`form-input ${errors.district ? 'error' : ''}`} value={form.district} onChange={f('district')} placeholder="e.g. Pune" required />
          </FormField>
          <FormField label="Phone" required={true} error={errors.phone}>
            <input id="broker-edit-phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={f('phone')} placeholder="10-digit mobile number" maxLength={10} required />
          </FormField>
          <FormField label="Network Status" required={true}>
            <select id="broker-edit-status" className="form-input" value={form.status} onChange={f('status')}>
              <option value="Active">Active (Permit immediate sourcing)</option>
              <option value="Inactive">Inactive / On Hold</option>
            </select>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}