import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import Modal from '../../components/app/Modal'
import { customersApi } from '../../api/services'

// ✅ Aligned with your exact PostgreSQL DB Schema & Spec metrics
const normalizeCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.full_name,
  mobile: customer.mobile_1,
  email: customer.email || '-',
  city: customer.city || '',
  files: customer.active_files_count ?? 0, // Maps to aggregate database count view
  created: customer.created_at ? customer.created_at.slice(0, 10) : '',
  type: customer.customer_type || 'Individual',
})

export default function CustomersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Explicitly controlled tracking state for form elements
  const [form, setForm] = useState({ 
    name: '', 
    mobile: '', 
    email: '',
    city: '',
    customer_type: 'Individual',
    pan_number: '',
    aadhar_number: ''
  })

  const loadCustomers = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customersApi.list()
      
      // Safeguard: Only run map if the backend explicitly returns an Array
      if (data && Array.isArray(data)) {
        setRows(data.map(normalizeCustomer))
      } else {
        // If it's an object with a custom error message detail, use it
        console.error("Backend did not return an array:", data)
        throw new Error(data?.detail || 'Unexpected response format from the server.')
      }
      
    } catch (err: any) {
      console.error("API Fetch Error:", err)
      setError(err?.message || 'Unable to load customers')
      
      // Keep your fallback mock data so your layout stays visible if the server is down
      setRows([
        { id: '1', name: 'Rajesh Kumar', mobile: '+919876543210', email: 'rajesh@gmail.com', city: 'Anand', files: 2, created: '2026-05-20' },
        { id: '2', name: 'Priya Mehta', mobile: '+918765432109', email: 'priya@gmail.com', city: 'Nadiad', files: 1, created: '2026-05-19' },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  const handleCreate = async () => {
    if (!form.name || !form.mobile) {
      setError('Full name and primary mobile are required fields.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const created = await customersApi.create({
        full_name: form.name,
        mobile_1: form.mobile,
        email: form.email || null,
        city: form.city || null,
        customer_type: form.customer_type,
        pan_number: form.pan_number ? form.pan_number.toUpperCase() : null,
        aadhar_number: form.aadhar_number || null
      } as any)
      
      // ✅ Only run on server response status success
      setRows([normalizeCustomer(created), ...rows])
      
      // Reset form variables
      setForm({ 
        name: '', 
        mobile: '', 
        email: '', 
        city: '', 
        customer_type: 'Individual', 
        pan_number: '', 
        aadhar_number: '' 
      })
      
      setOpen(false)
    } catch (err: any) {
      console.error("Database submission failure:", err)
      
      // ── Clean User-Friendly Error Translation Layer ──
      const errorMessage = err?.response?.data?.detail || err?.message || '';
      if (errorMessage.includes('customer_mobile_1_key') || errorMessage.includes('already exists')) {
        setError('A customer with this mobile number is already registered in the system.')
      } else if (errorMessage.includes('customer_email_key')) {
        setError('This email address is already in use by another customer.')
      } else {
        setError('Unable to save record. Please check your inputs and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader title="Customers" subtitle="All registered customers and client accounts within the system" />
      
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ── Main Data View Grid (Restored!) ── */}
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--gray-400)', fontWeight: 500 }}>
          Loading customer pipeline directory...
        </div>
      ) : (
        <DataTable
          rows={rows}
          searchKeys={['name', 'mobile', 'city', 'email']}
          onAdd={() => setOpen(true)}
          addLabel="New customer"
          columns={[
            { 
              key: 'id', 
              label: 'ID',
              render: (r) => (
                <span style={{ fontFamily: 'monospace', color: 'var(--gray-400)', fontSize: '0.8rem' }} title={r.id}>
                  #{r.id.slice(0, 6)}
                </span>
              )
            },
            {
              key: 'name', label: 'Customer Name',
              render: (r) => (
                <span 
                  style={{ color: 'var(--brand-600)', fontWeight: 600, cursor: 'pointer' }} 
                  onClick={() => navigate(`/customers/${r.id}`)}
                >
                  {r.name}
                </span>
              ),
            },
            { key: 'mobile', label: 'Mobile Number' },
            { key: 'email', label: 'Email Address' },
            { key: 'city', label: 'City' },
            { 
              key: 'files', 
              label: 'Active Files',
              render: (r) => (
                <span style={{ 
                  background: r.files > 0 ? 'var(--brand-50)' : 'var(--gray-50)', 
                  color: r.files > 0 ? 'var(--brand-700)' : 'var(--gray-400)',
                  padding: '4px 8px', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem'
                }}>
                  {r.files} active
                </span>
              )
            },
            { key: 'created', label: 'Created Date' },
          ]}
        />
      )}

      {/* ── Safe, Form-Intercepted Creation Dialog Modal ── */}
      <Modal
        open={open}
        title="Create Customer Record"
        onClose={() => setOpen(false)}
        onSubmit={handleCreate}
      >
        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          
          <div className="form-group">
            <label style={labelStyle}>Profile Classification *</label>
            <select
              style={inputStyle}
              value={form.customer_type}
              onChange={(e) => setForm({ ...form, customer_type: e.target.value })}
            >
              <option value="Individual">Individual Client</option>
              <option value="Business">Business Entity / Commercial</option>
            </select>
          </div>

          <div className="form-group">
            <label style={labelStyle}>Full Name / Business Title *</label>
            <input
              style={inputStyle}
              placeholder="e.g. Rajesh Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label style={labelStyle}>Primary Mobile *</label>
              <input
                style={inputStyle}
                placeholder="e.g. 9843754164"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={labelStyle}>City Location</label>
            <input
              style={inputStyle}
              placeholder="e.g. Anand"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderTop: '1px solid var(--gray-100)', paddingTop: 16, marginTop: 4 }}>
            <div className="form-group">
              <label style={labelStyle}>PAN Identification Number</label>
              <input
                style={{ ...inputStyle, textTransform: 'uppercase' }}
                placeholder="ABCDE1234F"
                maxLength={10}
                value={form.pan_number}
                onChange={(e) => setForm({ ...form, pan_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label style={labelStyle}>Aadhar Card Number</label>
              <input
                style={inputStyle}
                placeholder="1234 5678 9012"
                maxLength={12}
                value={form.aadhar_number}
                onChange={(e) => setForm({ ...form, aadhar_number: e.target.value })}
              />
            </div>
          </div>

        </form>
      </Modal>
    </>
  )
}

const labelStyle = { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 };
const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: '0.9rem', outline: 'none', background: 'var(--surface-0)', boxSizing: 'border-box' as const };