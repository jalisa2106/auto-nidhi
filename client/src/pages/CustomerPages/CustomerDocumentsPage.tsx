import React, { useState, useMemo } from 'react';
import { Shield, UploadCloud, CheckCircle2, AlertTriangle, Clock, FileText, Download, Trash2, Eye } from 'lucide-react';
import PageHeader from '../../components/app/PageHeader';

// ─── TYPES & INTERFACES ───
type DocCategory = 'kyc' | 'transactional';
type DocStatus = 'verified' | 'pending_review' | 'rejected' | 'missing';

interface VaultDocument {
  id: string;
  document_type: string;
  label: string;
  category: DocCategory;
  status: DocStatus;
  file_name?: string;
  file_size?: number;
  uploaded_at?: string;
  rejection_reason?: string;
}

export default function CustomerDocumentsPage() {
  // 1. Core State Management
  const [activeTab, setActiveTab] = useState<DocCategory>('kyc');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocSlot, setSelectedDocSlot] = useState<VaultDocument | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 2. Local State Vault (Mocking database data structure)
  const [documents, setDocuments] = useState<VaultDocument[]>([
    // Core KYC Set (Always present)
    { id: 'kyc_1', document_type: 'aadhar_front', label: 'Aadhaar Card (Front)', category: 'kyc', status: 'verified', file_name: 'aadhar_front_signed.pdf', file_size: 1245890, uploaded_at: '2026-05-10T10:30:00Z' },
    { id: 'kyc_2', document_type: 'aadhar_back', label: 'Aadhaar Card (Back)', category: 'kyc', status: 'verified', file_name: 'aadhar_back_signed.pdf', file_size: 1102450, uploaded_at: '2026-05-10T10:32:00Z' },
    { id: 'kyc_3', document_type: 'pan_card', label: 'PAN Card Official Copy', category: 'kyc', status: 'rejected', file_name: 'pan_blurry_scan.jpeg', file_size: 450200, uploaded_at: '2026-05-12T14:15:00Z', rejection_reason: 'The uploaded image is blurry and text characters are not readable. Please upload a high-resolution scan or clear photo.' },
    { id: 'kyc_4', document_type: 'passport_photo', label: 'Passport Size Photograph', category: 'kyc', status: 'pending_review', file_name: 'photo_johndoe.png', file_size: 890000, uploaded_at: '2026-05-25T09:00:00Z' },
    { id: 'kyc_5', document_type: 'address_proof', label: 'Permanent Address Proof', category: 'kyc', status: 'missing' },
    
    // Asset/Transaction Set (Generated dynamically by linked active files)
    { id: 'tx_1', document_type: 'vehicle_rc', label: 'Vehicle RC Book (File: TN-05-AX-1234)', category: 'transactional', status: 'verified', file_name: 'rc_book_final.pdf', file_size: 2415000, uploaded_at: '2026-05-15T11:20:00Z' },
    { id: 'tx_2', document_type: 'insurance_copy', label: 'Motor Insurance Policy Copy', category: 'transactional', status: 'pending_review', file_name: 'insurance_draft_v2.pdf', file_size: 3150000, uploaded_at: '2026-05-27T16:45:00Z' },
    { id: 'tx_3', document_type: 'dealer_invoice', label: 'Commercial Proforma Invoice', category: 'transactional', status: 'missing' }
  ]);

  // 3. Compute High-Level Global Statistics
  const stats = useMemo(() => {
    const total = documents.filter(d => d.status !== 'missing').length;
    const verified = documents.filter(d => d.status === 'verified').length;
    const pending = documents.filter(d => d.status === 'pending_review').length;
    const rejected = documents.filter(d => d.status === 'rejected').length;
    const missing = documents.filter(d => d.status === 'missing').length;
    return { total, verified, pending, rejected, missing };
  }, [documents]);

  // 4. File Size & Date Formatter Utilities
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // 5. Frontend Drag & Drop File Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = (file: File) => {
    if (!selectedDocSlot) return;

    // Strict Client-Side File Type Validation Guard
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid format! Please upload a valid PDF, JPEG, or PNG file.");
      return;
    }

    // Strict Client-Side File Size Constraint Guard (5MB Limit)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("File size bounds exceeded! Maximum upload limit per asset slot is 5MB.");
      return;
    }

    // Simulated Backend Pipeline processing
    setUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 150);

    // Finalizing database update simulation block
    setTimeout(() => {
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setDocuments(prevDocs => prevDocs.map(doc => {
          if (doc.id === selectedDocSlot.id) {
            return {
              ...doc,
              status: 'pending_review', // Moves into the admin's audit pipeline instantly
              file_name: file.name,
              file_size: file.size,
              uploaded_at: new Date().toISOString(),
              rejection_reason: undefined // Clears past rejections on fresh submission
            };
          }
          return doc;
        }));
        setUploading(false);
        setUploadModalOpen(false);
        setSelectedDocSlot(null);
      }, 200);
    }, 800);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUploadClick = (doc: VaultDocument) => {
    setSelectedDocSlot(doc);
    setUploadProgress(0);
    setUploadModalOpen(true);
  };

  const handleRemoveDoc = (id: string) => {
    if (window.confirm("Are you sure you want to delete this document from the vault? This action resets the slot configuration status.")) {
      setDocuments(prevDocs => prevDocs.map(doc => {
        if (doc.id === id) {
          return { ...doc, status: 'missing', file_name: undefined, file_size: undefined, uploaded_at: undefined, rejection_reason: undefined };
        }
        return doc;
      }));
    }
  };

  // Filter documents to display based on current tab selection
  const visibleDocuments = documents.filter(d => d.category === activeTab);

  return (
    <>
      <PageHeader title="Digital Document Vault" subtitle="Upload and manage your global KYC credentials and asset verification files" />

      {/* ─── WORKFLOW AUDIT HEALTH OVERVIEW CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: 'var(--brand-50)', padding: 12, borderRadius: 6, color: 'var(--brand-600)' }}><Shield size={24}/></div>
          <div><p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>TOTAL VAULT ITEMS</p><p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 700 }}>{stats.total + stats.missing}</p></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#f0fdf4', padding: 12, borderRadius: 6, color: '#166534' }}><CheckCircle2 size={24}/></div>
          <div><p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>VERIFIED CLEAR</p><p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#15803d' }}>{stats.verified}</p></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#fffbeb', padding: 12, borderRadius: 6, color: '#92400e' }}><Clock size={24}/></div>
          <div><p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>PENDING AUDIT</p><p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#b45309' }}>{stats.pending}</p></div>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 8, padding: 16, display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ background: '#fef2f2', padding: 12, borderRadius: 6, color: '#991b1b' }}><AlertTriangle size={24}/></div>
          <div><p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600 }}>ACTION REQUIRED</p><p style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontWeight: 700, color: '#b91c1c' }}>{stats.rejected + stats.missing}</p></div>
        </div>
      </div>

      {/* ─── NAVIGATION TAB TOGGLE STRIP ─── */}
      <div className="drawer-tabs" style={{ borderBottom: '1px solid var(--gray-200)', marginBottom: 24, display: 'flex', gap: 20 }}>
        <button className={`tab-button ${activeTab === 'kyc' ? 'active' : ''}`} onClick={() => setActiveTab('kyc')}>
          Core KYC Profile Vault ({documents.filter(d => d.category === 'kyc' && d.status !== 'missing').length}/5)
        </button>
        <button className={`tab-button ${activeTab === 'transactional' ? 'active' : ''}`} onClick={() => setActiveTab('transactional')}>
          Linked Transaction & Asset Documents ({documents.filter(d => d.category === 'transactional' && d.status !== 'missing').length}/3)
        </button>
      </div>

      {/* ─── INTERACTIVE DOCUMENT ACTION MATRIX GRID ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        {visibleDocuments.map((doc) => {
          return (
            <div 
              key={doc.id} 
              style={{ 
                background: '#fff', 
                border: doc.status === 'missing' ? '2px dashed var(--gray-300)' : '1px solid var(--gray-200)', 
                borderRadius: 8, 
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ background: 'var(--gray-50)', padding: 10, borderRadius: 6, border: '1px solid var(--gray-200)' }}>
                      <FileText size={20} style={{ color: 'var(--gray-500)' }}/>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--gray-900)' }}>{doc.label}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--gray-400)' }}>Type Key: {doc.document_type}</p>
                    </div>
                  </div>

                  {/* Status Indicator Badges */}
                  <span style={{ 
                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                    backgroundColor: doc.status === 'verified' ? '#dcfce7' : doc.status === 'pending_review' ? '#fef3c7' : doc.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                    color: doc.status === 'verified' ? '#15803d' : doc.status === 'pending_review' ? '#92400e' : doc.status === 'rejected' ? '#b91c1c' : '#4b5563',
                  }}>
                    {doc.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* File Attachment Info Metadata Section */}
                {doc.status !== 'missing' ? (
                  <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: 6, padding: 10, marginTop: 14, fontSize: '0.82rem' }}>
                    <p style={{ margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {doc.file_name}</p>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--gray-400)', display: 'flex', gap: 12 }}>
                      <span>Size: {formatBytes(doc.file_size)}</span>
                      <span>•</span>
                      <span>Uploaded: {formatDate(doc.uploaded_at)}</span>
                    </p>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', margin: '14px 0' }}>
                    No file binary linked to this requirement block yet. Upload required for audit progression.
                  </p>
                )}

                {/* Admin Audit Disapproval Exception Handling Code Block */}
                {doc.status === 'rejected' && doc.rejection_reason && (
                  <div style={{ marginTop: 12, padding: 10, background: '#fef2f2', borderLeft: '3px solid #ef4444', borderRadius: '0 4px 4px 0' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#991b1b' }}>Admin Rejection Reason:</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#b91c1c', lineHeight: 1.4 }}>{doc.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Action Operations Toolbar Row */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--gray-100)' }}>
                {doc.status === 'missing' ? (
                  <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => triggerUploadClick(doc)}>
                    <UploadCloud size={14}/> Upload File
                  </button>
                ) : doc.status === 'rejected' ? (
                  <>
                    <button className="btn btn-danger btn-sm" style={{ padding: '6px 8px' }} onClick={() => handleRemoveDoc(doc.id)}><Trash2 size={14}/></button>
                    <button className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => triggerUploadClick(doc)}>
                      <UploadCloud size={14}/> Re-upload Asset
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff' }} onClick={() => alert("Launching inline safe CDN sandbox document view preview window browser frame...")}>
                      <Eye size={14}/> Preview
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff' }}>
                      <Download size={14}/> Download
                    </button>
                    {doc.status === 'pending_review' && (
                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', padding: '6px 8px' }} title="Withdraw upload and reset slot" onClick={() => handleRemoveDoc(doc.id)}>
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── CENTRALIZED UPLOAD CONTAINER MODAL BACKDROP ─── */}
      {uploadModalOpen && selectedDocSlot && (
        <div className="modal-backdrop" onClick={() => !uploading && setUploadModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 500, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Upload File — {selectedDocSlot.label}</h3>
              <button className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => setUploadModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ padding: '16px 0' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                Please upload an official verifiable digital record asset. Supported format structures include **PDF, JPEG, or PNG** binary media layouts. Maximum constraint footprint limit per payload is **5MB**.
              </p>

              {/* Central Active Upload Dropzone Matrix Component Frame */}
              {!uploading ? (
                <div 
                  className={`dropzone-area ${dragActive ? 'active-dragging' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: dragActive ? '2px dashed var(--brand-500)' : '2px dashed var(--gray-300)',
                    backgroundColor: dragActive ? 'var(--brand-50)' : 'var(--gray-50)',
                    borderRadius: 8, padding: '32px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                  onClick={() => document.getElementById('vault-hidden-file-input')?.click()}
                >
                  <UploadCloud size={36} style={{ color: dragActive ? 'var(--brand-500)' : 'var(--gray-400)', marginBottom: 12 }}/>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Drag & drop your file here, or <span style={{ color: 'var(--brand-600)' }}>browse files</span></p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--gray-400)' }}>PDF, PNG, JPG up to 5MB footprint dimensions</p>
                  
                  <input 
                    type="file" 
                    id="vault-hidden-file-input" 
                    style={{ display: 'none' }} 
                    accept=".pdf, .png, .jpg, .jpeg"
                    onChange={handleFileInput}
                  />
                </div>
              ) : (
                /* Dynamic Upload Activity Metrics Progress Monitors */
                <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                  <div className="spinner" style={{ border: '3px solid var(--gray-200)', borderTop: '3px solid var(--brand-600)', borderRadius: '50%', width: 28, height: 28, animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Transferring secure data stream chunks to cloud vault...</p>
                  <div style={{ width: '100%', backgroundColor: 'var(--gray-200)', borderRadius: 4, height: 6, marginTop: 12, overflow: 'hidden' }}>
                    <div style={{ backgroundColor: 'var(--brand-600)', height: '100%', width: `${uploadProgress}%`, transition: 'width 0.1s ease' }} />
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 500 }}>Upload Progress: {uploadProgress}% Completed</p>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-sm" disabled={uploading} onClick={() => setUploadModalOpen(false)}>
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}