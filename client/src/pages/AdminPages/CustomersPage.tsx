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
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', city: '' })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const loadCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await customersApi.list()
      setRows(response.data.map(normalizeCustomer)) 
    } catch (err: any) {
      setError(extractError(err) || 'Unable to load customers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const updateForm = (field: 'name' | 'mobile' | 'city', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (formError) setFormError('')
  }

  const validateForm = () => {
    const nextErrors: Record<string, string> = {}
    const trimmedName = form.name.trim()
    const trimmedCity = form.city.trim()
    const mobileClean = form.mobile.replace(/\D/g, '')

    if (!trimmedName) {
      nextErrors.name = 'Name is required'
    } else if (!/^[A-Za-z ]+$/.test(trimmedName)) {
      nextErrors.name = 'Name must contain letters and spaces only'
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = 'Mobile number is required'
    } else if (!/^\d{10}$/.test(mobileClean)) {
      nextErrors.mobile = 'Mobile number must be exactly 10 digits'
    }

    if (form.city && !trimmedCity) {
      nextErrors.city = 'City cannot be empty'
    } else if (trimmedCity && !/^[A-Za-z ]+$/.test(trimmedCity)) {
      nextErrors.city = 'City must contain letters and spaces only'
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const mapApiErrorsToFields = (err: any) => {
    const detail = err?.response?.data?.detail
    if (!Array.isArray(detail)) return {}

    const nextErrors: Record<string, string> = {}
    for (const item of detail) {
      const field = item?.loc?.[item.loc.length - 1]
      if (field === 'full_name') nextErrors.name = item.msg
      if (field === 'mobile_1') nextErrors.mobile = item.msg
      if (field === 'city') nextErrors.city = item.msg
    }
    return nextErrors
  }

  const handleCreate = async () => {
    setFormError('')
    if (!validateForm()) return

    const trimmedName = form.name.trim()
    const trimmedCity = form.city.trim()
    const mobileClean = form.mobile.replace(/\D/g, '')

    setLoading(true)
    try {
      const created = await customersApi.create({
        full_name: trimmedName,
        mobile_1: mobileClean,
        city: trimmedCity || undefined,
      })
      setRows([normalizeCustomer(created), ...rows])
      setForm({ name: '', mobile: '', city: '' })
      setFormErrors({})
      setFormError('')
      setOpen(false)
    } catch (err: any) {
      const apiFieldErrors = mapApiErrorsToFields(err)
      if (Object.keys(apiFieldErrors).length > 0) {
        setFormErrors(apiFieldErrors)
      } else {
        setFormError(extractError(err) || 'Unable to create customer')
      }
    } finally {
      setLoading(false)
    }
  }

  // Extract user-friendly error message from API / axios errors
  function extractError(err: any): string | undefined {
    const resp = err?.response?.data
    if (!resp) return err?.message
    const detail = resp.detail ?? resp.message
    if (!detail) return typeof resp === 'string' ? resp : JSON.stringify(resp)
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      // Pydantic validation errors: [{loc, msg, type}, ...]
      return detail.map((d: any) => d?.msg || (typeof d === 'string' ? d : JSON.stringify(d))).join('; ')
    }
    // Fallback
    return String(detail)
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
        onClose={() => {
          setOpen(false)
          setFormErrors({})
          setFormError('')
        }}
        onSubmit={handleCreate}
      >
        {formError && <div className="form-error">{formError}</div>}
        <div className="form-group">
          <label className="form-label">Full name<span className="req">*</span></label>
          <input
            className={`form-input ${formErrors.name ? 'error' : ''}`}
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            required
          />
          {formErrors.name && <span className="form-error">{formErrors.name}</span>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Mobile<span className="req">*</span></label>
            <input
              className={`form-input ${formErrors.mobile ? 'error' : ''}`}
              value={form.mobile}
              onChange={(e) => updateForm('mobile', e.target.value)}
              required
            />
            {formErrors.mobile && <span className="form-error">{formErrors.mobile}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input
              className={`form-input ${formErrors.city ? 'error' : ''}`}
              value={form.city}
              onChange={(e) => updateForm('city', e.target.value)}
            />
            {formErrors.city && <span className="form-error">{formErrors.city}</span>}
          </div>
        </div>
      </Modal>
    </>
  )
}
