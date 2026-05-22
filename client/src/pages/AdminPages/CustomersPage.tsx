import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'
import { customersApi } from '../../api/services'

const normalizeCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.full_name,
  mobile: customer.mobile_1,
  city: customer.city || '',
  files: customer.files ?? 0,
  created: customer.created_at ? customer.created_at.slice(0, 10) : '',
})

export default function CustomersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', city: '' })

  const loadCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customersApi.list()
      setRows(data.map(normalizeCustomer))
    } catch (err: any) {
      setError(err?.message || 'Unable to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.mobile) {
      setError('Name and mobile are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      const created = await customersApi.create({
        full_name: form.name,
        mobile_1: form.mobile,
        city: form.city,
      })
      setRows([normalizeCustomer(created), ...rows])
      setForm({ name: '', mobile: '', city: '' })
      setOpen(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Unable to create customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Customers" subtitle="All customers in the system" />
      {error && <div className="form-error">{error}</div>}
      {loading ? (
        <div className="data-empty">Loading customers...</div>
      ) : (
        <DataTable
          rows={rows}
          searchKeys={['name', 'mobile', 'city']}
          onAdd={() => setOpen(true)}
          addLabel="New customer"
          columns={[
            { key: 'id', label: 'ID' },
            {
              key: 'name', label: 'Name',
              render: (r) => (
                <a className="auth-link" style={{ cursor: 'pointer' }} onClick={() => navigate(`/customers/${r.id}`)}>
                  {r.name}
                </a>
              ),
            },
            { key: 'mobile', label: 'Mobile' },
            { key: 'city', label: 'City' },
            { key: 'files', label: 'Active Files' },
            { key: 'created', label: 'Created' },
          ]}
        />
      )}
      <Modal
        open={open}
        title="Create customer"
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
      >
        <div className="form-group">
          <label className="form-label">Full name<span className="req">*</span></label>
          <input
            className="form-input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mobile<span className="req">*</span></label>
            <input
              className="form-input"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className="form-input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </>
  )
}
