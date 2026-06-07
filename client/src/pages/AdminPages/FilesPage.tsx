import { useState, useEffect } from "react";
import PageHeader from "../../components/app/PageHeader";
import DataTable from "../../components/app/DataTable";
import Modal from "../../components/app/Modal";
import { filesApi } from "../../api/services";
import api from "../../api/axios";
import { message } from "antd";
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { SelectiveExportModal } from "../../components/app/SelectiveExportModal";
import { exportDetailPDFsAsZip } from "../../utils/zipExportUtils";
import FileDetailDrawer from "../../components/app/FileDetailDrawer";
import Pagination from "../../components/app/Pagination";

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  draft: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8' },
  login: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  under_process: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  sanctioned: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  disbursed: { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  completed: { bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  cancelled: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
};

function formatStatus(status: string) {
  if (!status) return 'Draft';
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function FilesPage() {
  const role = localStorage.getItem('user_role') || 'guest';
  const isAdmin = role === 'admin';

  const [drawerFileId, setDrawerFileId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [filteredRows, setFilteredRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editFile, setEditFile] = useState<any>(null);
  const [editForm, setEditForm] = useState({ file_type: '', status: '', remarks: '' });
  const [customers, setCustomers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [form, setForm] = useState({ customer_id: '', bank_id: '', file_type: '', status: '', remarks: '' });
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || filteredRows
    const data = list.map((r) => ({
      'File #': r.file_number,
      'Customer': r.customer,
      'Type': r.type ? r.type.split('_').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '',
      'Status': formatStatus(r.status),
      'Bank': r.bank,
      'Assigned': r.assigned || '—',
      'Created': r.created,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Files')
    XLSX.writeFile(wb, `files_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || filteredRows
    const doc = new jsPDF({ orientation: 'landscape' })
    const today = new Date().toLocaleDateString('en-IN')

    doc.setFontSize(16)
    doc.text('Files Report', 14, 15)
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text(`Generated on: ${today}`, 14, 22)
    doc.setTextColor(0)

    autoTable(doc, {
      startY: 28,
      head: [
        ['File #', 'Customer', 'Type', 'Status', 'Bank', 'Assigned', 'Created'],
      ],
      body: list.map((r) => [
        r.file_number,
        r.customer,
        r.type ? r.type.split('_').map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : '',
        formatStatus(r.status),
        r.bank,
        r.assigned || '—',
        r.created,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    })

    doc.save(`files_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await filesApi.list(
        page,
        pageSize,
        statusF || undefined,
        typeF || undefined
      );
      setRows(response.data);
      setFilteredRows(response.data);
      setTotalRows(response.total ?? response.data?.length ?? 0);
    } catch (err) {
      message.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [typeF, statusF]);

  useEffect(() => {
    loadFiles();
  }, [page, pageSize, typeF, statusF]);

  useEffect(() => {
    if (addOpen) {
      if (customers.length === 0) {
        api.get('/customers/?limit=1000')
          .then(res => setCustomers(Array.isArray(res.data) ? res.data : []))
          .catch(() => message.error('Failed to load customers'));
      }
      if (banks.length === 0) {
        api.get('/finance-banks/all')
          .then(res => {
             if (res.data && Array.isArray(res.data.data)) {
                 setBanks(res.data.data);
             } else {
                 setBanks([]);
             }
          })
          .catch(() => message.error('Failed to load banks'));
      }
    }
  }, [addOpen]);

  const handleCreate = async () => {
    if (!form.customer_id) return message.error("Please select a customer");
    if (!form.bank_id) return message.error("Please select a bank");
    if (!form.file_type) return message.error("File type is required");
    if (!form.status) return message.error("Status is required");
    
    try {
      setLoading(true);
      await filesApi.create(form);
      message.success("File created successfully");
      setAddOpen(false);
      setForm({ customer_id: '', bank_id: '', file_type: '', status: '', remarks: '' });
      loadFiles();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Failed to create file");
    } finally {
      setLoading(false);
    }
  };

  const openEditFile = (row: any) => {
    setEditFile(row);
    setEditForm({ file_type: row.type || '', status: row.status || '', remarks: row.remarks || '' });
  };

  const handleUpdateFile = async () => {
    if (!editFile) return;
    if (!editForm.file_type) return message.error("File type is required");
    if (!editForm.status) return message.error("Status is required");
    try {
      setLoading(true);
      await filesApi.update(editFile.id, editForm);
      message.success("File updated successfully");
      setEditFile(null);
      loadFiles();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Failed to update file");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!confirmDelete) return;
    try {
      setLoading(true);
      await filesApi.remove(confirmDelete.id);
      message.success(`File ${confirmDelete.file_number} deleted`);
      setConfirmDelete(null);
      loadFiles();
    } catch (err: any) {
      message.error(err?.response?.data?.detail || 'Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s: string) => {
    const rawStatus = s?.toLowerCase().replace(' ', '_') || "draft";
    const sc = STATUS_COLOR[rawStatus] || STATUS_COLOR.draft;
    
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        background: sc.bg, 
        color: sc.text, 
        padding: '3px 9px', 
        borderRadius: 99, 
        fontSize: '.7rem', 
        fontWeight: 700 
      }}>
        {formatStatus(s)}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title="Files"
        subtitle="All loan & insurance files"
        actions={
          isAdmin && (
            <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
              + New file
            </button>
          )
        }
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <select
          className="form-select"
          style={{ maxWidth: 180 }}
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
        >
          <option value="">All types</option>
          <option value="new_vehicle">New Vehicle</option>
          <option value="used_vehicle">Used Vehicle</option>
          <option value="renewal">Renewal</option>
        </select>

        <select
          className="form-select"
          style={{ maxWidth: 200 }}
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="login">Login</option>
          <option value="under_process">Under Process</option>
          <option value="sanctioned">Sanctioned</option>
          <option value="disbursed">Disbursed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <DataTable
        rows={rows}
        loading={loading}
        searchKeys={["file_number", "customer", "bank", "assigned"]}
        onFilteredChange={setFilteredRows}
        rightSlot={
          <>
            <button className="btn btn-outline btn-sm" onClick={() => { setExportMode('excel'); setExportModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              Export Excel
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => { setExportMode('pdf'); setExportModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="15" y2="17" />
              </svg>
              Export PDF
            </button>
          </>
        }
        columns={[
          {
            key: "file_number",
            label: "File #",
            render: (r) => (
              <a
                className="auth-link"
                style={{ cursor: "pointer", fontWeight: 600 }}
                onClick={() => setDrawerFileId(r.id)}
              >
                {r.file_number}
              </a>
            ),
          },
          { key: "customer", label: "Customer" },
          { key: "type", label: "Type" },
          {
            key: "status",
            label: "Status",
            render: (r) => statusBadge(r.status),
          },
          { key: "bank", label: "Bank" },
          { key: "assigned", label: "Assigned" },
          { key: "created", label: "Created" },
          {
            key: "actions",
            label: "Actions",
            render: (r) => isAdmin ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }}
                  onClick={(e) => { e.stopPropagation(); openEditFile(r); }}
                  title="Edit file"
                >
                  <Pencil size={13} />
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ padding: '5px 10px', borderColor: '#fca5a5', color: '#dc2626' }}
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }}
                  title="Delete file"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ) : null
          },
        ]}
      />

      <Modal open={addOpen} title="Create New File" onClose={() => setAddOpen(false)} onSubmit={handleCreate} maxWidth="500px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">
              Customer <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select className="form-input" value={form.customer_id} onChange={(e) => setForm(p => ({ ...p, customer_id: e.target.value }))} required>
              <option value="">-- Select Customer --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.mobile_1})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">
              Bank <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select className="form-input" value={form.bank_id} onChange={(e) => setForm(p => ({ ...p, bank_id: e.target.value }))} required>
              <option value="">-- Select Bank --</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                File Type <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" value={form.file_type} onChange={(e) => setForm(p => ({ ...p, file_type: e.target.value }))} required>
                <option value="">-- Select Type --</option>
                <option value="new_vehicle">New Vehicle</option>
                <option value="used_vehicle">Used Vehicle</option>
                <option value="renewal">Renewal</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">
                Status <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select className="form-select" value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} required>
                <option value="">-- Select Status --</option>
                <option value="draft">Draft</option>
                <option value="login">Login</option>
                <option value="under_process">Under Process</option>
                <option value="sanctioned">Sanctioned</option>
                <option value="disbursed">Disbursed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-input" rows={2} value={form.remarks} onChange={(e) => setForm(p => ({ ...p, remarks: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '32px 28px', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="#dc2626" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Delete File?</div>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>This action cannot be undone.</div>
              </div>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 24px', lineHeight: 1.6 }}>
              Are you sure you want to delete file <strong>{confirmDelete.file_number}</strong> for customer <strong>{confirmDelete.customer}</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button
                className="btn btn-sm"
                style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                onClick={handleDeleteFile}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit File Modal */}
      <Modal open={!!editFile} title={`Edit File — ${editFile?.file_number || ''}`} onClose={() => setEditFile(null)} onSubmit={handleUpdateFile} maxWidth="480px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">File Type <span style={{ color: '#dc2626' }}>*</span></label>
              <select className="form-select" value={editForm.file_type} onChange={(e) => setEditForm(p => ({ ...p, file_type: e.target.value }))}>
                <option value="">-- Select Type --</option>
                <option value="new_vehicle">New Vehicle</option>
                <option value="used_vehicle">Used Vehicle</option>
                <option value="renewal">Renewal</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status <span style={{ color: '#dc2626' }}>*</span></label>
              <select className="form-select" value={editForm.status} onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))}>
                <option value="">-- Select Status --</option>
                <option value="draft">Draft</option>
                <option value="login">Login</option>
                <option value="under_process">Under Process</option>
                <option value="sanctioned">Sanctioned</option>
                <option value="disbursed">Disbursed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-input" rows={2} value={editForm.remarks} onChange={(e) => setEditForm(p => ({ ...p, remarks: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
        </div>
      </Modal>

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select Files to Export"
        rows={filteredRows}
        getRecordName={(r) => r.file_number || 'File'}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          // A6: fetch full file details for each selected file before generating ZIP
          let enriched = selected;
          try {
            enriched = await Promise.all(
              selected.map(async (r: any) => {
                try {
                  const detail = await filesApi.detail(r.id);
                  return { ...r, ...detail };
                } catch {
                  return r; // skip enrichment for this file if fetch fails
                }
              })
            );
          } catch {
            message.warning('Some file details could not be fetched — exporting available data');
          }
          await exportDetailPDFsAsZip(
            `files_details_${new Date().toISOString().slice(0, 10)}`,
            enriched,
            (r) => [
              { label: 'File Sequence Number',  value: r.file_number },
              { label: 'Customer Name',          value: r.customer_name || r.customer },
              { label: 'Customer Mobile',        value: r.customer_mobile || '—' },
              { label: 'File Type',              value: r.file_type || r.type ? (r.file_type || r.type).split('_').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ') : '—' },
              { label: 'Status',                 value: formatStatus(r.status) },
              { label: 'Bank Name',              value: r.bank_name || r.bank },
              { label: 'Assigned Staff',         value: r.assigned_to_name || r.assigned || '—' },
              { label: 'Vehicle Model',          value: r.vehicle_model || '—' },
              { label: 'Chassis Number',         value: r.chassis_number || '—' },
              { label: 'Engine Number',          value: r.engine_number || '—' },
              { label: 'LAN Number',             value: r.lan_number || '—' },
              { label: 'Loan Amount',            value: r.loan_amount ? `₹${r.loan_amount}` : '—' },
              { label: 'EMI Amount',             value: r.emi_amount ? `₹${r.emi_amount}` : '—' },
              { label: 'Insurance Policy',       value: r.policy_number || '—' },
              { label: 'RTO Number',             value: r.rto_number || '—' },
              { label: 'Payment IN Total',       value: r.payment_in_total ? `₹${r.payment_in_total}` : '—' },
              { label: 'Payment OUT Total',      value: r.payment_out_total ? `₹${r.payment_out_total}` : '—' },
              { label: 'Remarks',                value: r.remarks || '—' },
              { label: 'Created Date',           value: r.created },
            ],
            (r) => `${r.file_number || 'File'}_${r.customer_name || r.customer || ''}`,
            'File Profile',
            'File'
          );
        }}
      />

      {/* A8: Pagination */}
      <Pagination
        total={totalRows}
        page={page}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(s) => { setPageSize(s); setPage(1); }}
      />

      {/* File Detail Drawer */}
      <FileDetailDrawer
        fileId={drawerFileId}
        onClose={() => setDrawerFileId(null)}
      />
    </>
  );
}