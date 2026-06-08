import { useEffect, useState } from 'react'
import { message } from 'antd'
import { Check, X, Clock, PlayCircle, ShieldCheck } from 'lucide-react'
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
  decision_note?: string
  reviewed_by_name?: string
  reviewed_at?: string
}

const TABS = [
  { id: 'pending', label: 'Pending', icon: <Clock size={14} /> },
  { id: 'verification', label: 'Under Verification', icon: <ShieldCheck size={14} /> },
  { id: 'in_progress', label: 'In Progress', icon: <PlayCircle size={14} /> },
  { id: 'completed', label: 'Completed', icon: <Check size={14} /> },
  { id: 'rejected', label: 'Rejected', icon: <X size={14} /> },
]

export default function AdminReviewDeskPage() {
  const [tickets, setTickets] = useState<ManagementTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('pending')
  
  // Modal State
  const [actionModal, setActionModal] = useState<{ id: string; action: string } | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [actioning, setActioning] = useState(false)

  const loadTickets = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/modifications/pipeline')
      setTickets(res.data || [])
    } catch (err) {
      console.warn('Failed to sync master management queue:', err)
      message.error('Failed to load modification requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
  }, [])

  const openActionModal = (id: string, action: string) => {
    setActionModal({ id, action })
    setAdminNote('')
  }

  const submitAction = async () => {
    if (!actionModal) return
    if (actionModal.action === 'rejected' && !adminNote.trim()) {
      message.error('A rejection reason is mandatory.')
      return
    }

    setActioning(true)
    try {
      await api.post(`/admin/modifications/pipeline/${actionModal.id}/evaluate`, { 
        decision: actionModal.action,
        note: adminNote.trim() || undefined
      })
      message.success(`Ticket moved to ${actionModal.action.replace('_', ' ').toUpperCase()}`)
      loadTickets()
      setActionModal(null)
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to update ticket status')
    } finally {
      setActioning(false)
    }
  }

  const filteredTickets = tickets.filter(t => t.status === activeTab)

  return (
    <>
      <PageHeader 
        title="Administrative Review Desk" 
        subtitle="Unified Maker-Checker verification pipeline. Authorize and track escalated operational change requests." 
      />

      {/* ── Tabs Navigation ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(tab => {
          const count = tickets.filter(t => t.status === tab.id).length
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 18px', background: 'none', border: 'none',
                borderBottom: isActive ? '2px solid var(--brand-600)' : '2px solid transparent',
                color: isActive ? 'var(--brand-700)' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                whiteSpace: 'nowrap', transition: 'all 0.2s ease'
              }}
            >
              {tab.icon} {tab.label}
              <span style={{ 
                background: isActive ? 'var(--brand-100)' : '#f1f5f9', 
                padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', 
                color: isActive ? 'var(--brand-700)' : '#94a3b8' 
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Escalated By</th>
              <th>Data Target Node</th>
              <th>Target Identifier</th>
              <th>Modification Type</th>
              <th style={{ width: '30%' }}>Operational Justification Reason</th>
              <th style={{ textAlign: 'right' }}>Actions Workspace</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading pipeline records...</td></tr>
            ) : filteredTickets.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No requests currently in <strong>{activeTab.replace('_', ' ')}</strong> status.</td></tr>
            ) : (
              filteredTickets.map((t) => (
                <tr key={t.id}>
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
                  <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                    
                    {/* ── Dynamic State Machine Buttons ── */}
                    {['completed', 'rejected'].includes(t.status) ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 99, 
                          fontSize: '0.7rem', fontWeight: 700, 
                          background: t.status === 'completed' ? '#dcfce7' : '#fee2e2', 
                          color: t.status === 'completed' ? '#166534' : '#991b1b' 
                        }}>
                          {t.status === 'completed' ? <Check size={12}/> : <X size={12}/>} 
                          {t.status.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>By: <strong>{t.reviewed_by_name || 'Admin'}</strong></span>
                        {t.decision_note && (
                          <span style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.decision_note}>
                            "{t.decision_note}"
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
                        {t.status === 'pending' && (
                          <button className="btn btn-outline btn-sm" onClick={() => openActionModal(t.id, 'verification')} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>Move to Verification</button>
                        )}
                        {['pending', 'verification'].includes(t.status) && (
                          <button className="btn btn-outline btn-sm" onClick={() => openActionModal(t.id, 'in_progress')} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>Start Progress</button>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => openActionModal(t.id, 'completed')} style={{ background: '#10b981', borderColor: '#10b981', fontSize: '0.7rem', padding: '4px 8px' }}>Complete</button>
                        <button className="btn btn-primary btn-sm" onClick={() => openActionModal(t.id, 'rejected')} style={{ background: '#ef4444', borderColor: '#ef4444', fontSize: '0.7rem', padding: '4px 8px' }}>Reject</button>
                      </div>
                    )}

                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Status Action Modal ── */}
      {actionModal && (
        <div className="modal-backdrop" onClick={() => setActionModal(null)}>
          <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Status Update</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setActionModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: 16 }}>
                Are you sure you want to mark this request as <strong>{actionModal.action.replace('_', ' ').toUpperCase()}</strong>?
              </p>
              
              <div className="form-group">
                <label className="form-label">
                  Admin Notes / Reason 
                  {actionModal.action === 'rejected' && <span style={{ color: 'var(--error)' }}> *</span>}
                </label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  placeholder={actionModal.action === 'rejected' ? "Please provide a reason so staff can correct it..." : "Optional internal notes..."}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => setActionModal(null)}>Cancel</button>
              <button 
                className="btn btn-primary btn-sm" 
                onClick={submitAction}
                disabled={actioning || (actionModal.action === 'rejected' && !adminNote.trim())}
                style={{
                  background: actionModal.action === 'rejected' ? '#ef4444' : actionModal.action === 'completed' ? '#10b981' : 'var(--brand-600)',
                  borderColor: actionModal.action === 'rejected' ? '#ef4444' : actionModal.action === 'completed' ? '#10b981' : 'var(--brand-600)',
                }}
              >
                {actioning ? 'Saving...' : `Confirm ${actionModal.action.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase())}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}