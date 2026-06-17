import { useEffect, useState } from 'react'
import { PlusCircle, Landmark } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'
import { message } from 'antd'

interface ModificationRequest {
  id: string
  entity_type: string
  entity_id: string
  request_type: string
  reason: string
  status: string
  created_at: string
}

export default function AccountantModificationsPage() {
  const [requests, setRequests] = useState<ModificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [entityType, setEntityType] = useState('payment_in_ledger')
  const [entityId, setEntityId] = useState('')
  const [requestType, setRequestType] = useState('update')
  const [reason, setReason] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    setError(null)
    try {
      // Corrected: Removed the double /api/v1 prefix.
      const res = await api.get('/customer/modifications')
      setRequests(res.data || [])
    } catch (err: any) {
      setError('Failed to load requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entityId.trim() || !reason.trim()) return

    setSubmitting(true)
    try {
      // Corrected: Removed the double /api/v1 prefix.
      await api.post('/customer/modifications', {
        entity_type: entityType,
        entity_id: entityId,
        request_type: requestType,
        reason: reason
      })
      message.success('Request submitted successfully')
      setIsModalOpen(false)
      setEntityId('')
      setReason('')
      loadRequests()
    } catch (err: any) {
      console.warn('Error submitting modification request:', err)
      message.error(err?.response?.data?.detail || 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader 
        title="Ledger Override Requests" 
        subtitle="Submit correction tickets for certified balances, transaction books, or payouts to management review desk." 
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', borderColor: '#10b981' }}>
          <PlusCircle size={14} /> Log Balance Correction Request
        </button>
      </div>

      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Reference / ID</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Loading requests...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#ef4444' }}>{error}</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No modification requests found.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, textTransform: 'capitalize', color: 'var(--brand-700)' }}>{r.entity_type.replace(/_/g, ' ')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{r.entity_id}</td>
                  <td>
                    <span style={{
                      background: r.request_type === 'delete' ? '#fef2f2' : '#f0fdf4',
                      color: r.request_type === 'delete' ? '#b91c1c' : '#166534',
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase'
                    }}>
                      {r.request_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.84rem', color: '#475569' }}>{r.reason}</td>
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

      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 460, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Landmark size={18} color="#10b981" /> Request Balance Correction
              </h3>
              <button className="btn btn-ghost" disabled={submitting} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="form-label">What to correct</label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)} className="form-input">
                    <option value="payment_in_ledger">Payment IN record</option>
                    <option value="payment_out_ledger">Payment OUT record</option>
                    <option value="commission_distribution">Commission record</option>
                    <option value="advances_outstanding">Advance record</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Transaction ID / Reference</label>
                  <input type="text" required value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="e.g., UTR98374982312 or ID" className="form-input" />
                </div>

                <div>
                  <label className="form-label">Request Type</label>
                  <select value={requestType} onChange={e => setRequestType(e.target.value)} className="form-input">
                    <option value="update">Modify Posted Ledger Row Metrics</option>
                    <option value="delete">Hard Reverse / Annul Financial Row Entry</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Reason for correction</label>
                  <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why..." className="form-input" style={{ fontFamily: 'inherit' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ background: '#10b981', borderColor: '#10b981' }}>
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