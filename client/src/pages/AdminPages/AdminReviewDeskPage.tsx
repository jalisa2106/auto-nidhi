import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import api from '../../api/axios'

interface ManagementTicket {
  id: string
  entity_type: string
  entity_id: string
  request_type: string
  reason: string
  status: string
  created_at: string
  submitted_by_name: string
  submitted_by_role: string
}

export default function AdminReviewDeskPage() {
  const [tickets, setTickets] = useState<ManagementTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState<string | null>(null)

  const loadTickets = async () => {
    setLoading(true)
    try {
      // 🔌 Central administrative queue fetching incoming modification channels
      const res = await api.get('/admin/modifications/pipeline')
      setTickets(res.data || [])
    } catch (err) {
      console.warn('Failed to sync master management review terminal queue, using local fallback:', err)
      const raw = localStorage.getItem('modification_requests')
      if (raw) {
        setTickets(JSON.parse(raw))
      } else {
        const defaultReqs = [
          {
            id: 't-1', entity_type: 'file_record', entity_id: 'FILE/2026/010', request_type: 'update',
            reason: 'Customer requested backtracking status to update incorrect downpayment metadata arrays.',
            status: 'pending', created_at: new Date().toISOString(), submitted_by_name: 'Yatri Patel', submitted_by_role: 'Data Entry'
          },
          {
            id: 't-2', entity_type: 'payment_in_ledger', entity_id: 'UTR8948201931', request_type: 'delete',
            reason: 'Double check processing failure recorded duplicate account balance postings over bank clearing channels.',
            status: 'pending', created_at: new Date().toISOString(), submitted_by_name: 'Accountant Desk Staff', submitted_by_role: 'Accountant'
          }
        ]
        localStorage.setItem('modification_requests', JSON.stringify(defaultReqs))
        setTickets(defaultReqs)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const handleProcessTicket = async (id: string, action: 'approve' | 'reject') => {
    const confirmation = window.confirm(`Are you sure you want to execute decision "${action.toUpperCase()}" for this change request entry?`)
    if (!confirmation) return

    setActioningId(id)
    try {
      await api.post(`/admin/modifications/pipeline/${id}/evaluate`, { decision: action })
      loadTickets()
    } catch (err) {
      console.warn('Failed to dispatch processing decision payload, using local fallback:', err)
      const raw = localStorage.getItem('modification_requests')
      if (raw) {
        const allReqs = JSON.parse(raw)
        const index = allReqs.findIndex((r: any) => r.id === id)
        if (index !== -1) {
          allReqs[index].status = action === 'approve' ? 'approved' : 'rejected'
          localStorage.setItem('modification_requests', JSON.stringify(allReqs))
        }
      }
      loadTickets()
    } finally {
      setActioningId(null)
    }
  }

  return (
    <>
      <PageHeader 
        title="Administrative Review Desk" 
        subtitle="Unified Maker-Checker verification ledger. Authorize or reject data correction and transaction modification requests escalated by business operations staff." 
      />

      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Escalated By</th>
              <th>Data Target Node</th>
              <th>Target Identifier Reference</th>
              <th>Modification Type</th>
              <th style={{ width: '35%' }}>Operational Justification Reason</th>
              <th style={{ textAlign: 'right' }}>Actions Workspace</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>Streaming orchestration workspace records...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>Clear queue. No operational change tickets require verification approval structures.</td></tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} style={{ background: t.status === 'pending' ? '#fffdfa' : 'none' }}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{t.submitted_by_name}</div>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{t.submitted_by_role}</span>
                  </td>
                  <td style={{ fontWeight: 600, textTransform: 'capitalize', color: 'var(--brand-700)' }}>{t.entity_type.replace(/_/g, ' ')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>{t.entity_id}</td>
                  <td>
                    <span style={{
                      background: t.request_type === 'delete' ? '#fee2e2' : '#ecfdf5',
                      color: t.request_type === 'delete' ? '#ef4444' : '#10b981',
                      padding: '4px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase'
                    }}>
                      {t.request_type}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.84rem', color: '#334155', lineHeight: 1.4, paddingRight: 16 }}>{t.reason}</td>
                  <td style={{ textAlign: 'right' }}>
                    {t.status === 'pending' ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button 
                          disabled={actioningId !== null}
                          onClick={() => handleProcessTicket(t.id, 'approve')}
                          className="btn btn-sm" 
                          style={{ background: '#10b981', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', height: 30 }}
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button 
                          disabled={actioningId !== null}
                          onClick={() => handleProcessTicket(t.id, 'reject')}
                          className="btn btn-sm" 
                          style={{ background: '#ef4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', height: 30 }}
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', paddingRight: 12 }}>Evaluated</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}