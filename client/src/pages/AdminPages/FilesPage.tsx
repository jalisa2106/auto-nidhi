import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/app/PageHeader";
import DataTable from "../../components/app/DataTable";
import Modal from "../../components/app/Modal";
import { filesApi } from "../../api/services";
import api from "../../api/axios";
import { message } from "antd";

// Standardized color mapping based on Dashboard styles
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
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [form, setForm] = useState({ customer_id: '', bank_id: '', file_type: '', status: '', remarks: '' });

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await filesApi.list(
        1,
        100,
        statusF || undefined,
        typeF || undefined
      );
      setRows(response.data);
    } catch (err) {
      message.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [typeF, statusF]);

  useEffect(() => {
    if (addOpen) {
      if (customers.length === 0) {
        api.get('/customers?limit=1000')
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

  const statusBadge = (s: string) => {
    // Determine the raw key to look up colors (handling both "Under Process" and "under_process")
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
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + New file
          </button>
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
        columns={[
          {
            key: "file_number",
            label: "File #",
            render: (r) => (
              <a
                className="auth-link"
                style={{ cursor: "pointer", fontWeight: 600 }}
                onClick={() => navigate(`/files/${r.id}`)}
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
        ]}
      />

      <Modal open={addOpen} title="Create New File" onClose={() => setAddOpen(false)} onSubmit={handleCreate} maxWidth="500px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Customer <span className="req">*</span></label>
            <select className="form-input" value={form.customer_id} onChange={(e) => setForm(p => ({ ...p, customer_id: e.target.value }))} required>
              <option value="">-- Select Customer --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({c.mobile_1})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Bank <span className="req">*</span></label>
            <select className="form-input" value={form.bank_id} onChange={(e) => setForm(p => ({ ...p, bank_id: e.target.value }))} required>
              <option value="">-- Select Bank --</option>
              {banks.map((b) => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">File Type <span className="req">*</span></label>
              <select className="form-select" value={form.file_type} onChange={(e) => setForm(p => ({ ...p, file_type: e.target.value }))} required>
                <option value="">-- Select Type --</option>
                <option value="new_vehicle">New Vehicle</option>
                <option value="used_vehicle">Used Vehicle</option>
                <option value="renewal">Renewal</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status <span className="req">*</span></label>
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
    </>
  );
}