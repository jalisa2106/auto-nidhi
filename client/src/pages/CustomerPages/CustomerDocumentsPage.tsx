import { FolderOpen, Clock } from 'lucide-react'
import PageHeader from '../../components/app/PageHeader'

export default function CustomerDocumentsPage() {
  return (
    <>
      <PageHeader
        title="My Documents"
        subtitle="View all documents uploaded for your files"
      />
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
        <FolderOpen size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
        <h3 style={{ fontWeight: 700, marginBottom: 8, color: '#1e293b' }}>Documents</h3>
        <p style={{ fontSize: 14, marginBottom: 4 }}>
          This page will show all documents uploaded for your files.
        </p>
        <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#94a3b8' }}>
          <Clock size={13} /> Coming soon — being built by the team
        </p>
      </div>
    </>
  )
}
