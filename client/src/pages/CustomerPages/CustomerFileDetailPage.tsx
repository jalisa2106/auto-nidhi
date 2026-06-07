import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, IndianRupee, Folder, Activity } from 'lucide-react'
import api from '../../api/axios'
import { getDocumentLabel, type HistoryEvent } from '../../lib/mockCustomerFiles'
import FileStatusBadge, { type FileStatus } from '../../components/CustomerPages/FileStatusBadge'
import StatusTimeline from '../../components/CustomerPages/StatusTimeline'
import "../../components/CustomerPages/FileDetailDrawer.css"

interface CustomerFileDetail {
  id: string
  file_number: string
  file_type: string
  status: FileStatus
  assigned_to?: string | null
  customer_name?: string | null
  customer_email?: string | null
  remarks?: string | null
  finance_amount?: number | null
  finance_bank?: string | null
  lan_number?: string | null
  insurance_policy_number?: string | null
  insurance_valid_to?: string | null
  payment_paid?: number
  payment_outstanding?: number
  created_at?: string | null
  updated_at?: string | null
  documents?: Array<{
    id: string
    document_type: string
    status: string
    uploaded_at?: string
    uploaded_by?: string
    rejection_reason?: string
    file_size?: number
  }>
  history?: HistoryEvent[]
}

const documentTypeIcons: Record<string, string> = {
  aadhar_front: '🪪', aadhar_back: '🪪', pan_card: '💳', passport_photo: '📷',
  address_proof: '🏠', income_proof: '💼', bank_statement: '🏦', vehicle_rc: '🚗',
  insurance_copy: '📋', dealer_invoice: '📄', form_34_35: '📑', noc: '📜',
  signature_photo: '✍️', other: '📎'
}

const documentStatusColors: Record<string, { bg: string; color: string }> = {
  pending_review: { bg: '#fef3c7', color: '#92400e' },
  verified: { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' }
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString('en-IN') : '—'
}

export default function CustomerFileDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'documents' | 'timeline'>('overview')
  const [file, setFile] = useState<CustomerFileDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<CustomerFileDetail>(`/portal/files/${id}`)
      .then((res) => {
        setFile(res.data)
        setNotFound(false)
      })
      .catch((error) => {
        if (error.response?.status === 404) {
          setNotFound(true)
        }
        setFile(null)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-500)' }}>
        Loading file information...
      </div>
    )
  }

  if (!file || notFound) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h3>File Identifier Mismatch</h3>
        <p style={{ color: 'var(--gray-400)', marginTop: 8 }}>The file tracking sequence requested could not be resolved or located.</p>
        <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/portal/files')}>
          <ArrowLeft size={14} style={{ marginRight: 6 }} /> Return to Master Tracking Panel
        </button>
      </div>
    )
  }

  const documentsArray = file.documents || []
  const verifiedDocsCount = documentsArray.filter(d => d?.status === 'verified').length
  const pendingDocsCount = documentsArray.filter(d => d?.status === 'pending_review').length
  const rejectedDocsCount = documentsArray.filter(d => d?.status === 'rejected').length

  return (
    <>
      {/* Structural Tracking Detail Action Bar Header Alignment */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-outline btn-sm" style={{ padding: '6px 10px' }} onClick={() => navigate('/portal/files')}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>{file.file_number}</h2>
            <FileStatusBadge status={file.status} size="medium" />
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--gray-500)' }}>
            Portfolio Pipeline Workspace Entry • Type: {file.file_type.replace(/_/g, ' ').toUpperCase()}
          </p>
        </div>
      </div>

      {/* Main Container Control Block */}
      <div className="data-card" style={{ padding: 0, overflow: 'hidden', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="drawer-tabs" style={{ borderBottom: '1px solid var(--gray-200)', background: 'var(--gray-50)', padding: '0 32px', display: 'flex', gap: 32 }}>
          <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={15}/> Overview</button>
          <button className={`tab-button ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><IndianRupee size={15}/> Finance</button>
          <button className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Folder size={15}/> Documents ({documentsArray.length})</button>
          <button className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={15}/> Timeline / Audit History</button>
        </div>

        <div style={{ padding: '24px 0' }}>
          {activeTab === 'overview' && (
            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', padding: '0 24px' }}>
              <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>File Sequence Number</span><span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.file_number}</span></div>
              <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Asset Finance Specification</span><span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.file_type.replace(/_/g, ' ').toUpperCase()}</span></div>
              <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Created Date Registration</span><span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{formatDateTime(file.created_at)}</span></div>
              <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Last Processing Audit State</span><span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{formatDateTime(file.updated_at)}</span></div>
              {file.assigned_to && <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Clearing Officer</span><span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.assigned_to}</span></div>}
            </div>
          )}

          {activeTab === 'finance' && (
            <div style={{ padding: '0 24px' }}>
              {file.finance_amount && file.finance_bank ? (
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                  <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>FINANCE AMOUNT</span><span className="info-value" style={{ fontSize: '1.4rem', fontWeight: '700', color: '#10b981', display: 'block', marginTop: 4 }}>₹{file.finance_amount.toLocaleString('en-IN')}</span></div>
                  <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>CLEARING BANK</span><span className="info-value" style={{ fontSize: '1.05rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.finance_bank}</span></div>
                  {file.lan_number && <div className="info-item"><span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>LAN NUMBER</span><span className="info-value" style={{ fontSize: '1.05rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.lan_number}</span></div>}
                </div>
              ) : (
                <p style={{ color: 'var(--gray-400)', margin: 0 }}>No dynamic finance parameters mapped against this sequence.</p>
              )}

              {/* Extras block for Insurance and Payment Summary */}
              <div style={{ marginTop: 24, borderTop: '1px solid var(--gray-200)', paddingTop: 20 }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--gray-800)' }}>Other Service Details</h4>
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                  <div className="info-item">
                    <span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>INSURANCE POLICY</span>
                    <span className="info-value" style={{ fontSize: '0.95rem', fontWeight: 500, display: 'block', marginTop: 4 }}>{file.insurance_policy_number || 'N/A'}</span>
                    {file.insurance_valid_to && <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>Valid to: {formatDateTime(file.insurance_valid_to).split(',')[0]}</div>}
                  </div>
                  <div className="info-item">
                    <span className="info-label" style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 600 }}>PAYMENT SUMMARY</span>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>Paid: ₹{(file.payment_paid || 0).toLocaleString('en-IN')}</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>Due: ₹{(file.payment_outstanding || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="documents-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '0 24px 20px 24px' }}>
                <div className="stat-card verified" style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ fontSize: '1.2rem' }}>✅</span><div><p style={{ margin: 0, fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>VERIFIED</p><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#15803d' }}>{verifiedDocsCount}</p></div></div>
                <div className="stat-card pending" style={{ background: '#fffbeb', padding: 12, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ fontSize: '1.2rem' }}>⏳</span><div><p style={{ margin: 0, fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>PENDING</p><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#b45309' }}>{pendingDocsCount}</p></div></div>
                {rejectedDocsCount > 0 && <div className="stat-card rejected" style={{ background: '#fef2f2', padding: 12, borderRadius: 6, display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ fontSize: '1.2rem' }}>❌</span><div><p style={{ margin: 0, fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>REJECTED</p><p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#b91c1c' }}>{rejectedDocsCount}</p></div></div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 24px' }}>
                {documentsArray.map((doc) => {
                  const statusColor = documentStatusColors[doc.status] || { bg: '#f3f4f6', color: '#374151' }
                  return (
                    <div key={doc.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: '1.4rem' }}>{documentTypeIcons[doc.document_type] || '📄'}</span>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.92rem' }}>{getDocumentLabel(doc.document_type)}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)' }}>{doc.file_size ? `${(doc.file_size / 1024).toFixed(2)} KB` : 'N/A'}</p>
                          </div>
                        </div>
                        <span style={{ background: statusColor.bg, color: statusColor.color, padding: '3px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700 }}>{doc.status.replace(/_/g, ' ').toUpperCase()}</span>
                      </div>
                      {doc.rejection_reason && (
                        <div style={{ marginTop: 10, background: '#fef2f2', padding: 10, borderRadius: 4, borderLeft: '3px solid #ef4444' }}>
                          <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>Rejection Reason:</p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>{doc.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{ padding: '0 24px' }}>
              <StatusTimeline history={file.history || []} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}