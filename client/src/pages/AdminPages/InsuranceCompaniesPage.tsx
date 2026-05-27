import { useEffect, useState, useCallback } from 'react'
import { message } from 'antd'
import { Pencil, Trash2 } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'
import { insuranceCompaniesApi } from '../../api/services'

interface InsuranceCo {
  id: string
  company_name: string
  contact_person: string | null
  mobile_no: string | null
  phone_no: string | null
}

const EMPTY_FORM = {
  company_name: '',
  contact_person: '',
  mobile_no: '',
  phone_no: '',
}

export default function InsuranceCompaniesPage() {
  const [rows, setRows]       = useState<InsuranceCo[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen]       = useState(false)
  const [editRow, setEditRow] = useState<InsuranceCo | null>(null)
  const [form, setForm]       = useState({ ...EMPTY_FORM })
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await insuranceCompaniesApi.list(search)
      setRows(Array.isArray(res) ? res : res.data ?? [])
    } catch {
      message.error('Failed to load insurance companies')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setEditRow(null)
    setForm({ ...EMPTY_FORM })
    setOpen(true)
  }

  const openEdit = (row: InsuranceCo) => {
    setEditRow(row)
    setForm({
      company_name:   row.company_name   ?? '',
      contact_person: row.contact_person ?? '',
      mobile_no:      row.mobile_no      ?? '',
      phone_no:       row.phone_no       ?? '',
    })
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.company_name.trim()) {
      message.warning('Company name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        company_name:   form.company_name.trim(),
        contact_person: form.contact_person.trim() || null,
        mobile_no:      form.mobile_no.trim()      || null,
        phone_no:       form.phone_no.trim()        || null,
      }
      if (editRow) {
        await insuranceCompaniesApi.update(editRow.id, payload)
        message.success('Insurance company updated')
      } else {
        await insuranceCompaniesApi.create(payload)
        message.success('Insurance company added')
      }
      setOpen(false)
      load()
    } catch {
      message.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: InsuranceCo) => {
    try {
      await insuranceCompaniesApi.remove(row.id)
      message.success('Deleted')
      load()
    } catch {
      message.error('Failed to delete')
    }
  }

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <>
      <PageHeader
        title="Insurance Companies"
        subtitle="Master list of all insurance company partners"
      />

      {/* Search bar */}
      <div style={{ marginBottom: 14 }}>
        <input
          className="form-input"
          style={{ maxWidth: 320 }}
          placeholder="Search by company name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        rows={rows}
        searchKeys={['company_name', 'contact_person', 'mobile_no']}
        onAdd={openAdd}
        addLabel="Add Insurance Co."
        columns={[
          {
            key: 'company_name',
            label: 'Company Name',
            render: (r: InsuranceCo) => (
              <span
                className="auth-link"
                style={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => openEdit(r)}
              >
                {r.company_name}
              </span>
            ),
          },
          { key: 'contact_person', label: 'Contact Person', render: (r: InsuranceCo) => r.contact_person || '—' },
          { key: 'mobile_no',      label: 'Mobile',         render: (r: InsuranceCo) => r.mobile_no      || '—' },
          { key: 'phone_no',       label: 'Phone',          render: (r: InsuranceCo) => r.phone_no       || '—' },
          {
            key: 'actions',
            label: 'Actions',
            render: (r: InsuranceCo) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: '5px 10px', fontSize: '.78rem' }}
                  title="Edit"
                  onClick={() => openEdit(r)}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="btn btn-sm"
                  style={{ padding: '5px 10px', fontSize: '.78rem', background: '#fff5f5', color: '#b91c1c', border: '1.5px solid #fee2e2' }}
                  title="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete "${r.company_name}"?`)) handleDelete(r)
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>Loading…</div>}

      {/* Add / Edit Modal */}
      <Modal
        open={open}
        title={editRow ? 'Edit Insurance Company' : 'Add Insurance Company'}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      >
        {/* Company Name — required */}
        <div className="form-group">
          <label className="form-label">
            Company Name <span className="req">*</span>
          </label>
          <input
            className="form-input"
            placeholder="e.g. HDFC Ergo General Insurance"
            value={form.company_name}
            onChange={f('company_name')}
            required
          />
        </div>

        <div className="form-row">
          {/* Contact Person */}
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input
              className="form-input"
              placeholder="e.g. Rahul Mehta"
              value={form.contact_person}
              onChange={f('contact_person')}
            />
          </div>

          {/* Mobile No */}
          <div className="form-group">
            <label className="form-label">Mobile No.</label>
            <input
              className="form-input"
              placeholder="e.g. 9876543210"
              maxLength={15}
              value={form.mobile_no}
              onChange={f('mobile_no')}
            />
          </div>

          {/* Phone No */}
          <div className="form-group">
            <label className="form-label">Phone No.</label>
            <input
              className="form-input"
              placeholder="e.g. 022-12345678"
              maxLength={15}
              value={form.phone_no}
              onChange={f('phone_no')}
            />
          </div>
        </div>

        {saving && <p style={{ color: 'var(--gray-400)', fontSize: '.85rem', marginTop: 8 }}>Saving…</p>}
      </Modal>
    </>
  )
}
