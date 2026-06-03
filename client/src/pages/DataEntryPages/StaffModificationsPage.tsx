import { useEffect, useState } from 'react'
import { PlusCircle, ShieldAlert } from 'lucide-react'
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

export default function StaffModificationsPage() {
  const [requests, setRequests] = useState<ModificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form states
  const [entityType, setEntityType] = useState('file_record')
  const [entityId, setEntityId] = useState('')
  const [requestType, setRequestType] = useState('update')
  const [reason, setReason] = useState('')

  const loadRequests = async () => {
    setLoading(true)
    try {
      // 🔌 Scoped endpoint for tracking staff-submitted change entries
      const res = await api.get('/customer/modifications')
      setRequests(res.data || [])
    } catch (err) {
      console.error('Failed to stream staff requests queue:', err)
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
      console.error('Error logging override transaction:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader 
        title="Data Modification Desk" 
        subtitle="Escalate administrative data override or change requests for operations records." 
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={14} /> Escalate Change Request
        </button>
      </div>

      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Target Type</th>
              <th>System Row ID / Reference</th>
              <th>Operation Scope</th>
              <th>Justification Reason</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Streaming modification logs...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>No active modification tracking entries logged.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, textTransform: 'capitalize' }}>{r.entity_type.replace('_', ' ')}</td>
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
                  <td style={{ fontSize: '0.84rem', color: '#475569' }}>{r.reason}</td>
                  <td>
                    <span style={{
                      color: r.status === 'approved' ? '#166534' : r.status === 'rejected' ? '#991b1b' : '#b45309',
                      fontWeight: 700, fontSize: '0.8rem'
                    }}>
                      {r.status === 'approved' ? '✓ Approved' : r.status === 'rejected' ? '✕ Rejected' : '● Pending Review'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL WORKSPACE FORM */}
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
                  <label className="form-label">Data Module / Domain Target</label>
                  <select value={entityType} onChange={e => setEntityType(e.target.value)} className="form-input">
                    <option value="file_record">File Record Context (Backtrack Status)</option>
                    <option value="customer_profile">Customer Information / Profile Fields</option>
                    <option value="insurance_metadata">Insurance Contract Metadata</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Target System Record Number or ID</label>
                  <input type="text" required value={entityId} onChange={e => setEntityId(e.target.value)} placeholder="e.g., FILE/2026/010" className="form-input" />
                </div>

                <div>
                  <label className="form-label">Modification Strategy</label>
                  <select value={requestType} onChange={e => setRequestType(e.target.value)} className="form-input">
                    <option value="update">Correct/Update Data Values</option>
                    <option value="delete">Hard Purge / Erase Row Record</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Administrative Justification Notes</label>
                  <textarea rows={3} required value={reason} onChange={e => setReason(e.target.value)} placeholder="State explicitly why this administrative core record requires an manual override modification..." className="form-input" style={{ fontFamily: 'inherit' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline btn-sm" disabled={submitting} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Routing Ticket...' : 'Escalate to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}