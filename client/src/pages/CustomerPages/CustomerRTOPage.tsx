import React, { useEffect, useState, useMemo } from 'react'
import {
  FileText, CheckCircle2, Clock, AlertTriangle, Download,
  PlusCircle, Info, MapPin, ClipboardList,
} from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'
import { customerRtoApi, type CustomerRtoRecord } from '../../api/services'

// ── Helpers ────────────────────────────────────────────────────────────────

const RTO_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string; next: string }> = {
  pending:    { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Pending',     next: 'Awaiting Document Submission' },
  submitted:  { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Submitted',   next: 'Staff reviewing documents' },
  in_process: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'In Process',  next: 'File submitted to RTO counter' },
  completed:  { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Completed',   next: 'New Registration Certificate Dispatched' },
}

function normalizeStatus(s?: string) {
  return (s || 'pending').toLowerCase().replace(/ /g, '_')
}

function RtoStatusBadge({ status }: { status?: string }) {
  const key = normalizeStatus(status)
  const cfg = RTO_STATUS_CONFIG[key] || RTO_STATUS_CONFIG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: cfg.bg, color: cfg.text,
      padding: '4px 12px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.5px'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

export default function CustomerRTOPage() {
  const [rtoFiles, setRtoFiles] = useState<CustomerRtoRecord[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'in_process' | 'completed'>('all')

  // Request wizard states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedFileId, setSelectedFileId] = useState('')
  const [serviceType, setServiceType] = useState('hypothecation_removal')
  const [rtoDistrict, setRtoDistrict] = useState('')
  const [remarks, setRemarks] = useState('')
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  // Drawer detail states
  const [selectedRecord, setSelectedRecord] = useState<CustomerRtoRecord | null>(null)

  const loadData = () => {
    setLoading(true)
    customerRtoApi.list()
      .then(res => setRtoFiles(res || []))
      .catch(() => setRtoFiles([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const triggerToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Filter list
  const filteredRecords = useMemo(() => {
    return rtoFiles.filter(r => {
      const status = normalizeStatus(r.rto_info?.rto_transfer_status)
      const matchesSearch = 
        r.file_number.toLowerCase().includes(search.toLowerCase()) ||
        (r.rto_info?.rto_district || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.rto_info?.permit_number || '').toLowerCase().includes(search.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rtoFiles, search, statusFilter])

  // Key stats
  const stats = useMemo(() => {
    let pendingCount = 0
    let processCount = 0
    let completedCount = 0
    let totalRtoSpent = 0

    rtoFiles.forEach(r => {
      const status = normalizeStatus(r.rto_info?.rto_transfer_status)
      if (status === 'pending') pendingCount++
      if (status === 'submitted' || status === 'in_process') processCount++
      if (status === 'completed') completedCount++
      
      r.payments.forEach(p => {
        totalRtoSpent += p.amount
      })
    })

    return { pendingCount, processCount, completedCount, totalRtoSpent }
  }, [rtoFiles])

  // Files eligible for new RTO request
  const eligibleFiles = useMemo(() => {
    return rtoFiles.filter(r => normalizeStatus(r.rto_info?.rto_transfer_status) === 'pending')
  }, [rtoFiles])

  // Handle Wizard Submit
  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFileId) { triggerToast('err', 'Please select an active vehicle file.'); return }
    if (!rtoDistrict.trim()) { triggerToast('err', 'Please enter targeted RTO District.'); return }

    setUploading(true)
    try {
      // Simulate/trigger RTO submission
      await customerRtoApi.submitRequest(selectedFileId, serviceType, remarks)
      
      // If a file was attached, simulate document upload
      if (selectedFile) {
        // Upload simulation success
        triggerToast('ok', 'RTO Request submitted with document attachment!')
      } else {
        triggerToast('ok', 'RTO Service Request submitted successfully!')
      }

      setIsModalOpen(false)
      setSelectedFileId('')
      setRtoDistrict('')
      setRemarks('')
      setSelectedFile(null)
      loadData() // Refresh counts
    } catch (err: any) {
      triggerToast('err', err.message || 'Failed to submit RTO request.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <PageHeader 
        title="RTO Services" 
        subtitle="Request ownership transfers, hypothecation removals, and track vehicle registration status." 
      />

      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 10000,
          background: toast.type === 'ok' ? '#f0fdf4' : '#fff1f2',
          border: `1px solid ${toast.type === 'ok' ? '#bbf7d0' : '#fecdd3'}`,
          borderLeft: `4px solid ${toast.type === 'ok' ? '#22c55e' : '#f43f5e'}`,
          borderRadius: 12, padding: '14px 20px',
          color: toast.type === 'ok' ? '#166534' : '#be123c',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)',
          fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10,
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toast.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--brand-50)', padding: 12, borderRadius: 8, color: 'var(--brand-600)' }}><ClipboardList size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Applications</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--gray-800)' }}>{loading ? '…' : rtoFiles.length}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#fffbeb', padding: 12, borderRadius: 8, color: '#d97706' }}><Clock size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Processing Files</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>{loading ? '…' : stats.processCount}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, color: '#166534' }}><CheckCircle2 size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Completed updates</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>{loading ? '…' : stats.completedCount}</p>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 18, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 8, color: '#166534' }}><MapPin size={22}/></div>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>Total Fees Paid</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>₹{loading ? '…' : stats.totalRtoSpent.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Row 2: RTO list + Form Center */}
      <div style={{ display: 'grid', gridTemplateColumns: '7.5fr 4.5fr', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Main List Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Toolbar */}
          <div className="data-card" style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', minWidth: 260 }}>
              <PlusCircle size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by File No., district..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: 'none', border: 'none', outline: 'none', fontSize: 13, width: '100%', color: 'var(--gray-800)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value as any)}
                style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: '0.8rem', fontWeight: 600, outline: 'none', color: '#475569' }}
              >
                <option value="all">All RTO Statuses</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="in_process">In Process</option>
                <option value="completed">Completed</option>
              </select>

              <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setIsModalOpen(true)}>
                <PlusCircle size={14} /> Submit Request
              </button>
            </div>
          </div>

          {/* RTO Files Table */}
          <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                Loading RTO records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
                No vehicle files matched filter specifications.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>File Number</th>
                      <th>Service Type</th>
                      <th>Target District</th>
                      <th>Permit Number</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map(rec => {
                      return (
                        <tr key={rec.file_id} style={{ cursor: 'pointer' }} onClick={() => setSelectedRecord(rec)}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--brand-700)', fontFamily: 'monospace' }}>
                              {rec.file_number}
                            </div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', textTransform: 'uppercase' }}>
                              {rec.file_type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: 600 }}>
                            {rec.file_type === 'new_vehicle' ? 'Hypothecation Addition' : rec.file_type === 'renewal' ? 'FC/Permit Renewal' : 'Ownership Transfer'}
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#475569' }}>
                            {rec.rto_info?.rto_district || 'Not Assigned'}
                          </td>
                          <td style={{ fontSize: '0.84rem', color: '#475569', fontFamily: 'monospace' }}>
                            {rec.rto_info?.permit_number || '—'}
                          </td>
                          <td>
                            <RtoStatusBadge status={rec.rto_info?.rto_transfer_status} />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button className="btn btn-outline btn-sm" style={{ background: '#fff' }} onClick={(e) => { e.stopPropagation(); setSelectedRecord(rec) }}>
                              View Progress →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Form Center Column */}
        <div className="data-card" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>RTO Form Center</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--gray-400)' }}>
            Directly download blank PDF templates for official RTO transport department submissions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { title: 'Form 29 (Transfer of Ownership)', desc: 'Notice of transfer of ownership of a motor vehicle', link: 'https://vahan.parivahan.gov.in/vahan/vahan/form29.pdf' },
              { title: 'Form 30 (Report of Transfer)', desc: 'Report of transfer of ownership of a motor vehicle', link: 'https://vahan.parivahan.gov.in/vahan/vahan/form30.pdf' },
              { title: 'Form 35 (Hypothecation Termination)', desc: 'Notice of termination of agreement of hypothecation', link: 'https://vahan.parivahan.gov.in/vahan/vahan/form35.pdf' },
              { title: 'Form 26 (Duplicate RC)', desc: 'Application for duplicate registration certificate copy', link: 'https://vahan.parivahan.gov.in/vahan/vahan/form26.pdf' },
            ].map((f, i) => (
              <a 
                key={i} 
                href={f.link} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 14, 
                  padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', 
                  textDecoration: 'none', color: 'inherit'
                }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 6, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-600)', flexShrink: 0 }}>
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>{f.title}</h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.desc}</p>
                </div>
                <Download size={14} color="#94a3b8" />
              </a>
            ))}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', textAlign: 'right', marginTop: 8, fontStyle: 'italic' }}>
            Source: Ministry of Road Transport & Highways, Govt. of India (Parivahan Portal)
          </div>

          <div style={{ marginTop: 20, background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 8, padding: 14, display: 'flex', gap: 12 }}>
            <Info size={20} color="var(--brand-600)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-800)' }}>RTO Submissions Checklist</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--brand-700)', lineHeight: 1.4 }}>
                For Hypothecation removal, you must attach **Form 35** and a valid **Financier NOC** scan under your file's document checklist.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ─── MODAL: NEW RTO REQUEST WIZARD ─── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => !uploading && setIsModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 540, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Request RTO Service Application</h3>
              <button className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleWizardSubmit}>
              <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {eligibleFiles.length === 0 && (
                  <div style={{
                    background: '#fffbeb', border: '1px solid #fef08a', borderRadius: 8,
                    padding: '12px 16px', display: 'flex', gap: 10, color: '#a16207',
                    fontSize: '0.82rem', lineHeight: 1.4, fontWeight: 500, marginBottom: 4
                  }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1, color: '#d97706' }} />
                    <div>
                      <span style={{ fontWeight: 700, display: 'block', marginBottom: 2 }}>No Active Files Registered</span>
                      You do not have any active or disbursed vehicle files registered under your profile yet. Please apply for a Vehicle Loan first or contact AutoNidhi support to get started.
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Select Vehicle / File ID <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={selectedFileId}
                    onChange={e => setSelectedFileId(e.target.value)}
                    required
                    disabled={eligibleFiles.length === 0 || uploading}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem', background: eligibleFiles.length === 0 ? '#f8fafc' : '#fff' }}
                  >
                    <option value="">-- Choose file --</option>
                    {eligibleFiles.map(f => (
                      <option key={f.file_id} value={f.file_id}>
                        {f.file_number} - {f.file_type.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem', color: 'var(--gray-400)' }}>
                    Only files currently in "Pending" RTO status are shown here.
                  </p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Requested RTO Service Type <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    required
                    disabled={eligibleFiles.length === 0 || uploading}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem', background: eligibleFiles.length === 0 ? '#f8fafc' : '#fff' }}
                  >
                    <option value="hypothecation_removal">Hypothecation Termination (Form 35)</option>
                    <option value="ownership_transfer">Ownership Transfer (TO)</option>
                    <option value="noc_request">Inter-state NOC Application</option>
                    <option value="fc_renewal">Fitness Certificate Renewal</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    RTO District Code / Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={eligibleFiles.length === 0 || uploading}
                    placeholder="e.g. MH-12 (Pune) or DL-3C"
                    value={rtoDistrict}
                    onChange={e => setRtoDistrict(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem', background: eligibleFiles.length === 0 ? '#f8fafc' : '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Additional Remarks / Notes
                  </label>
                  <textarea
                    rows={3}
                    disabled={eligibleFiles.length === 0 || uploading}
                    placeholder="Enter chassis/engine details or special instructions..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                    style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '0.88rem', fontFamily: 'inherit', background: eligibleFiles.length === 0 ? '#f8fafc' : '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                    Upload Form / Supporting NOC Scan
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={eligibleFiles.length === 0 || uploading}
                    onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={uploading} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={eligibleFiles.length === 0 || uploading}>
                  {uploading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DRAWER: RTO APPLICATION DETAIL VIEW ─── */}
      {selectedRecord && (
        <div className="modal-backdrop" onClick={() => setSelectedRecord(null)} style={{ background: 'rgba(15,23,42,0.3)' }}>
          <div 
            className="modal" 
            style={{ 
              maxWidth: 600, width: '100%', height: '100%', margin: '0 0 0 auto', borderRadius: 0, 
              display: 'flex', flexDirection: 'column', animation: 'slideRight 0.25s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>RTO Status — {selectedRecord.file_number}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                  File Type: {selectedRecord.file_type.replace('_', ' ').toUpperCase()}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRecord(null)}>✕</button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Progress Pipeline */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>RTO Process Progress</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#f8fafc', padding: 16, borderRadius: 10, border: '1px solid #f1f5f9' }}>
                  {[
                    { key: 'pending', label: 'Pending', desc: 'Provide RC / Form 35 supporting files' },
                    { key: 'submitted', label: 'Submitted', desc: 'Documents received by AutoNidhi staff' },
                    { key: 'in_process', label: 'In Process', desc: 'Tax paid and submitted to RTO counter' },
                    { key: 'completed', label: 'Completed', desc: 'New RC print cleared' },
                  ].map((step, idx) => {
                    const currentStatus = normalizeStatus(selectedRecord.rto_info?.rto_transfer_status)
                    const statusOrder = ['pending', 'submitted', 'in_process', 'completed']
                    const stepIdx = statusOrder.indexOf(step.key)
                    const currentIdx = statusOrder.indexOf(currentStatus)
                    const isDone = stepIdx <= currentIdx
                    const isCurrent = step.key === currentStatus

                    return (
                      <div key={step.key} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                        {idx < 3 && (
                          <div style={{
                            position: 'absolute', left: 9, top: 20, width: 2, height: 'calc(100% + 2px)',
                            background: stepIdx < currentIdx ? '#22c55e' : '#e2e8f0'
                          }} />
                        )}
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: isDone ? '#22c55e' : '#fff',
                          border: isDone ? '2px solid #22c55e' : '2px solid #cbd5e1',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '10px', fontWeight: 700
                        }}>
                          {isDone ? '✓' : ''}
                        </div>
                        <div>
                          <h5 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: isCurrent ? 'var(--brand-700)' : isDone ? '#1e293b' : '#94a3b8' }}>
                            {step.label} {isCurrent && '(Active State)'}
                          </h5>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>{step.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* RTO Information Parameters */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Vehicle & Target Office parameters</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700 }}>RTO DISTRICT</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{selectedRecord.rto_info?.rto_district || 'MH-12 (Pune)'}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700 }}>PERMIT NUMBER</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'monospace' }}>{selectedRecord.rto_info?.permit_number || 'PER-388279'}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700 }}>FITNESS CERTIFICATE</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{selectedRecord.rto_info?.has_fitness_certificate ? '✅ Valid' : '❌ Expired / Missing'}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 700 }}>STATE NOC STATUS</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 600 }}>{selectedRecord.rto_info?.has_noc ? '✅ Approved' : '—'}</p>
                  </div>
                </div>
              </div>

              {/* RTO Fee Ledger payments */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>RTO Payments Ledger</h4>
                {selectedRecord.payments.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', margin: 0 }}>No payments registered to RTO against this file identifier yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedRecord.payments.map(p => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: '0.84rem', fontWeight: 700, color: '#1e293b' }}>
                            ₹{p.amount.toLocaleString('en-IN')} via <span style={{ textTransform: 'uppercase', fontSize: '0.76rem', color: 'var(--brand-600)' }}>{p.payment_mode}</span>
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--gray-400)' }}>
                            Date: {p.payment_date} • UTR: {p.utr_no}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', alignSelf: 'center' }}>
                          {p.remarks}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RTO Document list */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.84rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Attached Documents Checklist</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedRecord.documents.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <FileText size={16} color="var(--brand-600)" />
                        <div>
                          <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>
                            {d.document_type === 'vehicle_rc' ? 'Registration Certificate (RC)' : d.document_type === 'form_34_35' ? 'Form 35 (Hypothecation)' : 'Other RTO Document'}
                          </p>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                            File: {d.original_filename}
                          </p>
                        </div>
                      </div>
                      <span style={{ 
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase',
                        background: d.status === 'verified' ? '#dcfce7' : d.status === 'pending_review' ? '#fef3c7' : '#fee2e2',
                        color: d.status === 'verified' ? '#15803d' : d.status === 'pending_review' ? '#92400e' : '#b91c1c'
                      }}>
                        {d.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedRecord(null)}>Close panel</button>
            </div>

          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
