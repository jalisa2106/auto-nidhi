import { useEffect, useState } from 'react'
import { dealersApi } from '../../api/services'
import { Edit3, Trash2 } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'

// Soft delete note:
// The dealers master should use a soft-delete flag instead of hard deleting rows.
// DB migration required:
//   ALTER TABLE master_dealer ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
// Then update queries to only return rows where is_deleted = FALSE,
// and soft delete by setting is_deleted = TRUE.
// In SQLAlchemy, add:
//   is_deleted = Column(Boolean, nullable=False, default=False)


interface Dealer {
  id: string
  name: string
  city: string
  phone: string
  email: string
  deleted?: boolean
}

const emptyDealer: Omit<Dealer, 'id'> = {
  name: '',
  city: '',
  phone: '',
  email: '',
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const formatDealerId = (id: string) => {
  if (!id) return ''
  if (uuidRe.test(id)) return `DEALER-${id.slice(0, 8)}`
  return id
}

export default function DealersPage() {
  const [rows, setRows] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(false)  
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Dealer | null>(null)
  const [form, setForm] = useState<Omit<Dealer, 'id'>>(emptyDealer)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')

  function updateForm<K extends keyof Omit<Dealer, 'id'>>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (formError) setFormError('')
  }

  const loadDealers = async () => {
    setLoading(true)
    try {
      const data = await dealersApi.list()
      setRows(data)
    } catch (err) {
      console.error('Failed to load dealers', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDealers()
  }, [])

  function validateForm() {
    const nextErrors: Record<string, string> = {}
    const trimmedName = form.name.trim()
    const phoneClean = form.phone.replace(/\D/g, '')

    if (!trimmedName) {
      nextErrors.name = 'Dealer name is required'
    }
    if (form.phone && !/^\d{10}$/.test(phoneClean)) {
      nextErrors.phone = 'Phone must be exactly 10 digits'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = 'Enter a valid email address'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const resetForm = () => {
    setForm(emptyDealer)
    setErrors({})
    setFormError('')
    setEditing(null)
  }

  const openAddModal = () => {
    resetForm()
    setOpen(true)
  }

  const openEditModal = (dealer: Dealer) => {
    setEditing(dealer)
    setForm({
      name: dealer.name,
      city: dealer.city,
      phone: dealer.phone,
      email: dealer.email,
    })
    setErrors({})
    setFormError('')
    setOpen(true)
  }

  const closeModal = () => {
    setOpen(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!validateForm()) return

    try {
      if (editing) {
        const updated = await dealersApi.update(editing.id, form)
        setRows((prev) => prev.map((row) => (row.id === editing.id ? updated : row)))
        setOpen(false)
        setEditing(null)
        return
      }

      const created = await dealersApi.create(form)
      setRows((prev) => [created, ...prev])
      setOpen(false)
      resetForm()
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to save dealer')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Soft remove this dealer from active records?')) return

    try {
      await dealersApi.remove(id)
      setRows((prev) => prev.filter((row) => row.id !== id))
    } catch (err) {
      console.error('Failed to delete dealer', err)
    }
  }

  const formTitle = editing ? 'Edit Dealer' : 'Add Dealer'
  const submitLabel = editing ? 'Save changes' : 'Add dealer'

  return (
    <>
      <PageHeader title="Dealers" subtitle="Dealer master for partners, showrooms, and service contacts" />

      {loading && <div style={{ padding: '12px 0', color: 'var(--gray-500)' }}>Loading dealers...</div>}

      <DataTable
        rows={rows}
        searchKeys={['name', 'city', 'phone', 'email']}
        onAdd={openAddModal}
        addLabel="New dealer"
        pageSize={5}
        columns={[
          {
            key: 'id',
            label: 'ID',
            render: (row) => (
              <span style={{ fontFamily: 'monospace', color: 'var(--gray-500)', fontSize: '0.85rem' }}>{formatDealerId(row.id)}</span>
            ),
          },
          { key: 'name', label: 'Dealer Name' },
          { key: 'city', label: 'City' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => openEditModal(row)}
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDelete(row.id)}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        title={formTitle}
        onClose={closeModal}
        onSubmit={handleSave}
        submitLabel={submitLabel}
        maxWidth="560px"
      >
        {formError && <div className="form-error">{formError}</div>}

        <div className="form-group">
          <label className="form-label">
            Dealer name<span className="req">*</span>
          </label>
          <input
            className={`form-input ${errors.name ? 'error' : ''}`}
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            placeholder="Enter dealer name"
            autoFocus
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className={`form-input ${errors.city ? 'error' : ''}`}
              value={form.city}
              onChange={(e) => updateForm('city', e.target.value)}
              placeholder="City"
            />
            {errors.city && <span className="form-error">{errors.city}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              className={`form-input ${errors.phone ? 'error' : ''}`}
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
              placeholder="10-digit phone"
              maxLength={10}
            />
            {errors.phone && <span className="form-error">{errors.phone}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className={`form-input ${errors.email ? 'error' : ''}`}
            value={form.email}
            onChange={(e) => updateForm('email', e.target.value)}
            placeholder="Email address"
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>
      </Modal>
    </>
  )
}
