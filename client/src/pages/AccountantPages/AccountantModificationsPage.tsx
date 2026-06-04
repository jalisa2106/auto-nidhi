import { useEffect, useState } from 'react'
import { PlusCircle, Landmark } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states scoped for ledger data targets
  const [entityType, setEntityType] = useState('payment_in_ledger')
  const [entityId, setEntityId] = useState('')
  const [requestType, setRequestType] = useState('update')
  const [reason, setReason] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    try {
      // 🔌 Querying accountant verification lanes
      const res = await api.get('/customer/modifications')
      setRequests(res.data || [])
    } catch (err) {
      console.error('Failed to sync financial override queues:', err)
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
      await api.post('/customer/modifications', {
        entity_type: entityType,
        entity_id: entityId,
        request_type: requestType,
        reason: reason
      })
      setIsModalOpen(false)
      setEntityId('')
      setReason('')
      loadRequests()
    } catch (err) {
      console.error('Error submitting ledger override request:', err)
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
              <th>Financial Target Scope</th>
              <th>Transaction ID / Reference Token</th>
              <th>Operation Scope</th>
              <th>Audit Trail Justification</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Streaming cash books data pipeline...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No financial balancing modifications requested.</td></tr>
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
                      color: r.status === 'approved' ? '#15803d' : r.status === 'rejected' ? '#b91c1c' : '#d97706',
                      fontWeight: 700, fontSize: '0.8rem'
                    }}>
                      {r.status === 'approved' ? '✓ Compiled' : r.status === 'rejected' ? '✕ Denied' : '🕒 Pending Admin Action'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INTERACTIVE COMPANION POPUP FORM MODAL */}
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
                  <label className="form-label">Ledger Segment / Core Target</label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)} className="form-input">
                    <option value="payment_in_ledger">Payment IN Ledger Row Transaction</option>
                    <option value="payment_out_ledger">Payment OUT Ledger Row Transaction</option>
                    <option value="commission_distribution">Commission / Broker payout calculation value</option>
                    <option value="advances_outstanding">Advances Outstanding Balance Settlement State</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Transaction UUID Token / Voucher Reference</label>
                  <input type="text" required value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="e.g., UTR98374982312 or Row UUID Token" className="form-input" />
                </div>

                <div>
                  <label className="form-label">Adjustment Mode</label>
                  <select value={requestType} onChange={e => setRequestType(e.target.value)} className="form-input">
                    <option value="update">Modify Posted Ledger Row Metrics</option>
                    <option value="delete">Hard Reverse / Annul Financial Row Entry</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Audit Trail & Rectification Justification</label>
                  <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide accounting audit explanation describing why this asset balancing transaction column requires adjustment or cancellation parameters..." className="form-input" style={{ fontFamily: 'inherit' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting} style={{ background: '#10b981', borderColor: '#10b981' }}>
                  {submitting ? 'Escalating balancing ticket...' : 'Escalate Change to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}