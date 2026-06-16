import { useEffect, useState } from 'react'
import { PlusCircle, ShieldAlert, AlertCircle } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'
import { filesApi } from '../../api/services'

interface ModificationRequest {
  id: string
  entity_type: string
  entity_id: string
  request_type: string
  reason: string
  status: string
  created_at: string
  decision_note?: string
  reviewed_by_name?: string
  reviewed_at?: string
}

export default function StaffModificationsPage() {
  const [requests, setRequests] = useState<ModificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [entityType, setEntityType] = useState('file_record')
  const [entityId, setEntityId] = useState('')
  const [requestType, setRequestType] = useState('update')
  const [reason, setReason] = useState('')
  const [availableFiles, setAvailableFiles] = useState<any[]>([])

  const loadRequests = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/v1/customer/modifications')
      setRequests(res.data || [])
    } catch (err: any) {
      setError('Failed to load requests.')
    } finally {
      setLoading(false)
    }
  }

  const loadFiles = async () => {
    try {
      const res = await filesApi.list(1, 1000)
      setAvailableFiles(res.data || [])
    } catch (err) {
      console.error("Failed to load files:", err)
    }
  }

  useEffect(() => {
    loadRequests()
    loadFiles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityId.trim() || !reason.trim()) return

    setSubmitting(true)
    try {
      await api.post('/api/v1/customer/modifications', {
        entity_type: entityType,
        entity_id: entityId,
        request_type: requestType,
        reason: reason
      })
      loadRequests()
      setIsModalOpen(false)
      setEntityId('')
      setReason('')
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader 
        title="Modification Requests" 
        subtitle="Request changes to records that need admin approval." 
      />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px',
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
          color: '#b91c1c', fontSize: '.88rem', fontWeight: 500, marginBottom: 16,
        }}>
          <AlertCircle size={16} />
          {error}
          <button onClick={loadRequests} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto', fontSize: '.78rem' }}>Retry</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={14} /> New Request
        </button>
      </div>

      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>What to Change</th>
              <th>Target Record</th>
              <th>Action</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading requests...</td></tr>
            ) : requests.length === 0 && !error ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No modification requests yet.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.entity_type.replace(/_/g, ' ')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.entity_id}</td>
                  <td>
                    <span style={{
                      background: r.request_type === 'delete' ? '#fef2f2' : '#eff6ff',
                      color: r.request_type === 'delete' ? '#b91c1c' : '#1d4ed8',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase'
                    }}>
                      {r.request_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.84rem', color: '#475569', maxWidth: 280 }}>
                    {r.reason}
                    {r.decision_note && (
                      <div style={{ marginTop: 4, fontSize: '.76rem', color: '#64748b', fontStyle: 'italic' }}>
                        Admin note: {r.decision_note}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      color: r.status === 'completed' ? '#166534' : 
                            r.status === 'rejected' ? '#991b1b' : 
                            r.status === 'in_progress' ? '#1d4ed8' : 
                            '#b45309',
                      fontWeight: 700, fontSize: '0.8rem', textTransform: 'capitalize'
                    }}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REQUEST MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 460, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={18} color="var(--brand-600)" /> Request Data Modification
              </h3>
              <button className="btn btn-ghost" disabled={submitting} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">What do you want to change? <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)} className="form-input">
                    <option value="file_record">File Record</option>
                    <option value="customer_profile">Customer Profile</option>
                    <option value="insurance_metadata">Insurance Details</option>
                  </select>
                </div>

                <div>
                  {entityType === 'file_record' ? (
                    <>
                      <label className="form-label">Select File <span style={{ color: '#ef4444' }}>*</span></label>
                      <select 
                        required 
                        value={entityId} 
                        onChange={e => setEntityId(e.target.value)} 
                        className="form-input"
                      >
                        <option value="">-- Select File --</option>
                        {availableFiles.map((file) => (
                          <option key={file.id} value={file.file_number}>
                            {file.file_number} - {file.customer} {file.bank && file.bank !== '—' ? `(${file.bank})` : ''}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label className="form-label">Record ID or Name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input 
                        type="text" 
                        required 
                        value={entityId} 
                        onChange={e => setEntityId(e.target.value)} 
                        placeholder={entityType === 'customer_profile' ? "e.g. Customer ID or Name" : "e.g. Policy Number / ID"} 
                        className="form-input" 
                      />
                    </>
                  )}
                </div>

                <div>
                  <label className="form-label">Request Type</label>
                  <select value={requestType} onChange={e => setRequestType(e.target.value)} className="form-input">
                    <option value="update">Update / Correct Data</option>
                    <option value="delete">Delete Record</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Reason <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this change is needed..." className="form-input" style={{ fontFamily: 'inherit' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}