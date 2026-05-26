import { useEffect, useState } from 'react'
import { message } from 'antd'
import { Save, Building2, MapPin, Globe, Users2, Receipt, Landmark } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { companySettingsApi } from '../../api/services'

const EMPTY_FORM = {
  company_name: '',
  address_1: '',
  address_2: '',
  mobile_no: '',
  phone_no: '',
  country: '',
  state: '',
  city: '',
  pincode: '',
  email_address: '',
  fax_no: '',
  website: '',
  contact_person_1: '',
  contact_person_2: '',
  tin_no: '',
  gst_no: '',
  cst_no: '',
  pan_no: '',
  insurance_expiry_notification: '',
  opening_balance: '',
}

type FormState = typeof EMPTY_FORM

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0 6px 0', marginBottom: 4,
      borderBottom: '1.5px solid var(--gray-100)',
      gridColumn: '1 / -1',
    }}>
      <span style={{ color: 'var(--brand-600)' }}>{icon}</span>
      <span style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color: 'var(--gray-500)' }}>
        {title}
      </span>
    </div>
  )
}

export default function CompanySettingsPage() {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [profileId, setProfileId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load existing profile
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      try {
        const data = await companySettingsApi.get()
        if (data && data.id) {
          setProfileId(data.id)
          setForm({
            company_name: data.company_name || '',
            address_1: data.address_1 || '',
            address_2: data.address_2 || '',
            mobile_no: data.mobile_no || '',
            phone_no: data.phone_no || '',
            country: data.country || '',
            state: data.state || '',
            city: data.city || '',
            pincode: data.pincode || '',
            email_address: data.email_address || '',
            fax_no: data.fax_no || '',
            website: data.website || '',
            contact_person_1: data.contact_person_1 || '',
            contact_person_2: data.contact_person_2 || '',
            tin_no: data.tin_no || '',
            gst_no: data.gst_no || '',
            cst_no: data.cst_no || '',
            pan_no: data.pan_no || '',
            insurance_expiry_notification: data.insurance_expiry_notification || '',
            opening_balance: data.opening_balance != null ? String(data.opening_balance) : '',
          })
        }
      } catch {
        message.error('Failed to load company profile')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  function setField(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.company_name.trim()) e.company_name = 'Company name is required'
    if (!form.address_1.trim()) e.address_1 = 'Address Line 1 is required'
    if (!form.mobile_no.trim()) e.mobile_no = 'Mobile number is required'
    else if (!/^\d{10,15}$/.test(form.mobile_no.replace(/\D/g, ''))) e.mobile_no = 'Enter a valid 10–15 digit mobile number'
    if (form.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_address))
      e.email_address = 'Invalid email address'
    if (form.pan_no && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.pan_no.toUpperCase()))
      e.pan_no = 'Invalid PAN format (e.g. ABCDE1234F)'
    if (form.gst_no && form.gst_no.length !== 15) e.gst_no = 'GST number must be 15 characters'
    if (form.opening_balance && isNaN(Number(form.opening_balance))) e.opening_balance = 'Enter a valid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    const payload = {
      ...form,
      pan_no: form.pan_no ? form.pan_no.toUpperCase() : null,
      gst_no: form.gst_no ? form.gst_no.toUpperCase() : null,
      tin_no: form.tin_no || null,
      cst_no: form.cst_no || null,
      address_2: form.address_2 || null,
      phone_no: form.phone_no || null,
      country: form.country || null,
      state: form.state || null,
      city: form.city || null,
      pincode: form.pincode || null,
      email_address: form.email_address || null,
      fax_no: form.fax_no || null,
      website: form.website || null,
      contact_person_1: form.contact_person_1 || null,
      contact_person_2: form.contact_person_2 || null,
      insurance_expiry_notification: form.insurance_expiry_notification || null,
      opening_balance: form.opening_balance ? Number(form.opening_balance) : null,
    }
    try {
      if (profileId) {
        await companySettingsApi.update(profileId, payload)
        message.success('Company profile updated successfully')
      } else {
        const created = await companySettingsApi.create(payload)
        setProfileId(created.id)
        message.success('Company profile created successfully')
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') message.error(detail)
      else message.error('Failed to save company profile')
    } finally {
      setSaving(false)
    }
  }

  function field(
    label: string,
    key: keyof FormState,
    opts: { required?: boolean; placeholder?: string; type?: string; fullWidth?: boolean } = {}
  ) {
    return (
      <div className="form-group" style={opts.fullWidth ? { gridColumn: '1 / -1' } : {}}>
        <label className="form-label">
          {label} {opts.required && <span style={{ color: 'var(--error)' }}>*</span>}
        </label>
        <input
          type={opts.type || 'text'}
          className={`form-input${errors[key] ? ' error' : ''}`}
          value={form[key]}
          placeholder={opts.placeholder || ''}
          onChange={e => setField(key, e.target.value)}
        />
        {errors[key] && <span className="form-error">{errors[key]}</span>}
      </div>
    )
  }

  if (loading) return (
    <>
      <PageHeader title="Company Settings" subtitle="Business profile — GSTIN, PAN, address and contacts" />
      <div className="data-empty">Loading company profile…</div>
    </>
  )

  return (
    <>
      <PageHeader
        title="Company Settings"
        subtitle="Business profile — GSTIN, PAN, address and contacts"
      />

      <div className="data-card" style={{ padding: '24px 28px' }}>
        {/* Status banner */}
        {!profileId && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d',
            borderRadius: 8, padding: '10px 16px', marginBottom: 20,
            fontSize: '.84rem', color: '#92400e',
            gridColumn: '1 / -1',
          }}>
            ⚠️ No company profile found. Fill in the form below and click <strong>Save Settings</strong> to create one.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>

          {/* ── Basic Info ── */}
          <SectionHeader icon={<Building2 size={15} />} title="Basic Information" />
          {field('Company Name', 'company_name', { required: true, placeholder: 'AutoNidhi Consultancy Pvt Ltd', fullWidth: true })}
          {field('Address Line 1', 'address_1', { required: true, placeholder: 'Shop / Office no., Building name', fullWidth: true })}
          {field('Address Line 2', 'address_2', { placeholder: 'Street, Area', fullWidth: true })}
          {field('Mobile Number', 'mobile_no', { required: true, placeholder: '9876543210' })}
          {field('Phone Number', 'phone_no', { placeholder: '02012345678' })}
          {field('Email Address', 'email_address', { placeholder: 'info@autonidhi.com' })}

          {/* ── Location ── */}
          <SectionHeader icon={<MapPin size={15} />} title="Location" />
          {field('Country', 'country', { placeholder: 'India' })}
          {field('State', 'state', { placeholder: 'Maharashtra' })}
          {field('City', 'city', { placeholder: 'Pune' })}
          {field('Pincode', 'pincode', { placeholder: '411001' })}

          {/* ── Online & Communication ── */}
          <SectionHeader icon={<Globe size={15} />} title="Online & Communication" />
          {field('Website', 'website', { placeholder: 'https://autonidhi.in' })}
          {field('Fax Number', 'fax_no', { placeholder: '02012345679' })}

          {/* ── Contact Persons ── */}
          <SectionHeader icon={<Users2 size={15} />} title="Contact Persons" />
          {field('Contact Person 1', 'contact_person_1', { placeholder: 'Name, Designation' })}
          {field('Contact Person 2', 'contact_person_2', { placeholder: 'Name, Designation' })}

          {/* ── Tax & Legal ── */}
          <SectionHeader icon={<Receipt size={15} />} title="Tax & Legal" />
          {field('GST Number', 'gst_no', { placeholder: '27ABCDE1234F1Z5' })}
          {field('PAN Number', 'pan_no', { placeholder: 'ABCDE1234F' })}
          {field('TIN Number', 'tin_no', { placeholder: 'TIN number' })}
          {field('CST Number', 'cst_no', { placeholder: 'CST number' })}

          {/* ── Financial ── */}
          <SectionHeader icon={<Landmark size={15} />} title="Financial" />
          {field('Opening Balance (₹)', 'opening_balance', { type: 'number', placeholder: '0.00' })}
          {field('Insurance Expiry Notification (days)', 'insurance_expiry_notification', { placeholder: '30' })}
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            id="company-save-btn"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ minWidth: 160 }}
          >
            <Save size={15} style={{ marginRight: 6 }} />
            {saving ? 'Saving…' : profileId ? 'Update Settings' : 'Save Settings'}
          </button>
        </div>
      </div>
    </>
  )
}
