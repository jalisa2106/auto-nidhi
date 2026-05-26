import { useState } from 'react'
import { Save, User } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { message } from 'antd'

export default function CustomerProfilePage() {
  const storedName  = localStorage.getItem('user_name')  || ''
  const storedEmail = localStorage.getItem('user_email') || ''

  const [form, setForm] = useState({
    name:    storedName,
    email:   storedEmail,
    phone:   '',
    city:    '',
    state:   '',
    address: '',
  })
  const [saving, setSaving] = useState(false)

  function setField(key: keyof typeof form, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Update name in localStorage for immediate sidebar refresh
      localStorage.setItem('user_name', form.name)
      // TODO: call profileApi.update(form) when backend endpoint is ready
      message.success('Profile updated successfully')
    } catch {
      message.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="My Profile" subtitle="Manage your personal details" />

      <div className="data-card" style={{ padding: 28, maxWidth: 600 }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--brand-600), var(--brand-800))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: 800, color: '#fff',
          }}>
            {form.name ? form.name.slice(0, 1).toUpperCase() : <User size={32} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-900)' }}>{form.name || 'Customer'}</div>
            <div style={{ fontSize: '.83rem', color: 'var(--gray-400)' }}>Customer Account</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" value={form.email} disabled style={{ opacity: .6 }} />
            <span style={{ fontSize: '.72rem', color: 'var(--gray-400)' }}>Email cannot be changed</span>
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={form.phone} onChange={e => setField('phone', e.target.value)} placeholder="10-digit mobile" />
          </div>
          <div className="form-group">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={e => setField('city', e.target.value)} placeholder="Your city" />
          </div>
          <div className="form-group">
            <label className="form-label">State</label>
            <input className="form-input" value={form.state} onChange={e => setField('state', e.target.value)} placeholder="Your state" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Address</label>
            <textarea className="form-input" rows={2} value={form.address} onChange={e => setField('address', e.target.value)} placeholder="Your address" style={{ resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} style={{ marginRight: 6 }} />
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>
    </>
  )
}
