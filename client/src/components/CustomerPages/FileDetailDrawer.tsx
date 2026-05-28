import React, { useState } from 'react';
import { type MockFile, getDocumentLabel } from '../../lib/mockCustomerFiles';
import FileStatusBadge from './FileStatusBadge';
import StatusTimeline from './StatusTimeline';
import './FileDetailDrawer.css';

interface FileDetailDrawerProps {
  file: MockFile | null;
  isOpen: boolean;
  onClose: () => void;
}

const documentTypeIcons: Record<string, string> = {
  aadhar_front: '🪪',
  aadhar_back: '🪪',
  pan_card: '💳',
  passport_photo: '📷',
  address_proof: '🏠',
  income_proof: '💼',
  bank_statement: '🏦',
  vehicle_rc: '🚗',
  insurance_copy: '📋',
  dealer_invoice: '📄',
  form_34_35: '📑',
  noc: '📜',
  signature_photo: '✍️',
  other: '📎',
};

const defaultStatusColor = { bg: '#f3f4f6', color: '#374151' };

const documentStatusColors: Record<string, { bg: string; color: string }> = {
  pending_review: { bg: '#fef3c7', color: '#92400e' },
  verified: { bg: '#dcfce7', color: '#15803d' },
  rejected: { bg: '#fee2e2', color: '#b91c1c' },
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

const FileDetailDrawer: React.FC<FileDetailDrawerProps> = ({ file, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'documents' | 'timeline'>(
    'overview'
  );

  if (!file || !isOpen) return null;

  const documentsArray = file.documents || [];
  const verifiedDocsCount = documentsArray.filter((d) => d?.status === 'verified').length;
  const pendingDocsCount = documentsArray.filter((d) => d?.status === 'pending_review').length;
  const rejectedDocsCount = documentsArray.filter((d) => d?.status === 'rejected').length;

  return (
    <>
      {/* Dim overlay mask serving background context separation */}
      <div className="modal-backdrop" onClick={onClose}>
        
        {/* Main interactive center element panel body container cards */}
        <div 
          className="modal" 
          style={{ maxWidth: 680, width: '100%' }} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Layout Component Area */}
          <div className="modal-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--gray-900)' }}>
                File Space: {file.file_number}
              </h3>
              <div style={{ marginTop: 6 }}>
                <FileStatusBadge status={file.status} size="small" />
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.1rem', padding: '4px 8px' }}>
              ✕
            </button>
          </div>

          {/* Sub-tab segment navigation rules strip */}
          <div className="drawer-tabs" style={{ borderBottom: '1px solid var(--gray-200)', padding: '0 24px' }}>
            <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-button ${activeTab === 'finance' ? 'active' : ''}`} onClick={() => setActiveTab('finance')}>Finance</button>
            <button className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
              Documents {documentsArray.length > 0 && <span className="tab-badge">{documentsArray.length}</span>}
            </button>
            <button className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
          </div>

          {/* Core scroll content space matrix container viewports */}
          <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px 0' }}>
            
            {/* OVERVIEW SECTION TAB VIEWPORTS */}
            {activeTab === 'overview' && (
              <div className="tab-pane">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">File Number</span>
                    <span className="info-value">{file.file_number}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">File Type</span>
                    <span className="info-value">{(file.file_type || '').replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Current Pipeline Status</span>
                    <div className="info-value" style={{ marginTop: 2 }}>
                      <FileStatusBadge status={file.status} size="small" />
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Created On</span>
                    <span className="info-value">{formatDate(file.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Audited Change</span>
                    <span className="info-value">{formatDate(file.updated_at)}</span>
                  </div>
                  {file.assigned_to && (
                    <div className="info-item">
                      <span className="info-label">Assigned Executive</span>
                      <span className="info-value">{file.assigned_to}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* FINANCE INFORMATION INTERACTIVE TABS */}
            {activeTab === 'finance' && (
              <div className="tab-pane">
                <div className="info-section">
                  {file.finance_amount && file.finance_bank ? (
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Finance Sanc. Amount</span>
                        <span className="info-value" style={{ fontSize: '1.25rem', fontWeight: '600', color: '#10b981' }}>
                          ₹{file.finance_amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Underwriter Clearing Bank</span>
                        <span className="info-value">{file.finance_bank}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-message" style={{ padding: '0 24px', color: 'var(--gray-400)' }}>
                      No finance disbursement allocations mapped onto this file profile entry context.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* COMPONENT DOCUMENTS GALLERY GRID */}
            {activeTab === 'documents' && (
              <div className="tab-pane">
                {documentsArray.length > 0 ? (
                  <>
                    <div className="documents-stats">
                      <div className="stat-card verified">
                        <span className="stat-icon">✅</span>
                        <div className="stat-info">
                          <p className="stat-label">Verified</p>
                          <p className="stat-value">{verifiedDocsCount}</p>
                        </div>
                      </div>
                      <div className="stat-card pending">
                        <span className="stat-icon">⏳</span>
                        <div className="stat-info">
                          <p className="stat-label">Pending</p>
                          <p className="stat-value">{pendingDocsCount}</p>
                        </div>
                      </div>
                      {rejectedDocsCount > 0 && (
                        <div className="stat-card rejected">
                          <span className="stat-icon">❌</span>
                          <div className="stat-info">
                            <p className="stat-label">Rejected</p>
                            <p className="stat-value">{rejectedDocsCount}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="documents-list">
                      {documentsArray.map((doc) => {
                        const statusColor = documentStatusColors[doc.status] || defaultStatusColor;
                        return (
                          <div key={doc.id} className="document-item" style={{ border: '1px solid var(--gray-200)', borderRadius: 6, padding: 12 }}>
                            <div className="doc-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div className="doc-icon-name" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                <span className="doc-icon" style={{ fontSize: '1.3rem' }}>{documentTypeIcons[doc.document_type] || '📄'}</span>
                                <div className="doc-name">
                                  <p className="doc-type" style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{typeof getDocumentLabel === 'function' ? getDocumentLabel(doc.document_type) : doc.document_type}</p>
                                  <p className="doc-meta" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-400)' }}>{formatFileSize(doc.file_size)}</p>
                                </div>
                              </div>
                              <span
                                className="doc-status"
                                style={{
                                  backgroundColor: statusColor.bg,
                                  color: statusColor.color,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}
                              >
                                {(doc.status || '').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div className="doc-details" style={{ marginTop: 8, display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                              <span className="detail">{formatDate(doc.uploaded_at)}</span>
                              {doc.uploaded_by && <span className="detail">• Uploaded by {doc.uploaded_by}</span>}
                            </div>
                            {doc.rejection_reason && (
                              <div className="doc-rejection" style={{ marginTop: 8, background: '#fef2f2', padding: 8, borderRadius: 4, borderLeft: '3px solid #ef4444' }}>
                                <p className="rejection-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>Rejection Reason:</p>
                                <p className="rejection-text" style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#b91c1c' }}>{doc.rejection_reason}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="empty-message" style={{ padding: '0 24px', color: 'var(--gray-400)' }}>No structural digital documentation uploaded yet.</p>
                )}
              </div>
            )}

            {/* TIMELINE TRACKING LOG VIEWS MODULE */}
            {activeTab === 'timeline' && (
              <div className="tab-pane" style={{ padding: '0 24px' }}>
                <StatusTimeline history={file.history || []} />
              </div>
            )}
          </div>

          {/* Modal Footer Control Action Strip */}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
              Dismiss View
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileDetailDrawer;