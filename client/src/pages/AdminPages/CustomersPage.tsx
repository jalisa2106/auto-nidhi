import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X, FileSpreadsheet, FileDown, Pencil } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from "../../components/app/PageHeader";
import DataTable from "../../components/app/DataTable";
import Modal from "../../components/app/Modal";
import { customersApi } from "../../api/services";
import { message } from 'antd';
import { SelectiveExportModal } from "../../components/app/SelectiveExportModal";
import { exportDetailPDFsAsZip } from "../../utils/zipExportUtils";

const normalizeCustomer = (customer: any) => ({
  id: customer.id,
  name: customer.full_name,
  mobile: customer.mobile_1,
  email: customer.email || "-",
  city: customer.city || "-",
  state: customer.state || "-",
  aadhar: customer.aadhar_number || "-",
  pan: customer.pan_number || "-",
  files: customer.active_files_count ?? 0,
  created: customer.created_at ? customer.created_at.slice(0, 10) : "",
  type: customer.customer_type 
    ? customer.customer_type.charAt(0).toUpperCase() + customer.customer_type.slice(1) 
    : "Individual",
  raw: customer,
});

const emptyForm = () => ({
  name: "",
  mobile: "",
  mobile_2: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  date_of_birth: "",
  aadhar_number: "",
  pan_number: "",
  customer_type: "individual",
});

export default function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [viewCustomer, setViewCustomer] = useState<any>(null);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [editForm, setEditForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'pdf' | 'excel'>('pdf');

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => {
      return (
        String(r.name ?? "").toLowerCase().includes(q) ||
        String(r.mobile ?? "").toLowerCase().includes(q) ||
        String(r.city ?? "").toLowerCase().includes(q) ||
        String(r.state ?? "").toLowerCase().includes(q) ||
        String(r.email ?? "").toLowerCase().includes(q) ||
        String(r.aadhar ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const exportExcel = (itemsToExport?: any[]) => {
    const list = itemsToExport || filteredRows;
    const data = list.map((r, i) => ({
      '#': i + 1,
      ID: r.id ? `#${r.id.slice(0, 6)}` : '—',
      Name: r.name || '—',
      Type: r.type || 'Individual',
      Mobile: r.mobile || '—',
      State: r.state || '—',
      City: r.city || '—',
      Aadhaar: r.aadhar || '—',
      'Active Files': r.files || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = (itemsToExport?: any[]) => {
    const list = itemsToExport || filteredRows;
    const doc = new jsPDF({ orientation: 'landscape' });
    const today = new Date().toLocaleDateString('en-IN');

    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Customers Report', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated on: ${today} | Total Records: ${list.length}`, 14, 22);
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: 28,
      head: [
        ['#', 'ID', 'Customer Name', 'Type', 'Mobile', 'State', 'City', 'Aadhaar', 'Active Files'],
      ],
      body: list.map((r, i) => [
        i + 1,
        r.id ? `#${r.id.slice(0, 6)}` : '—',
        r.name || '—',
        r.type || 'Individual',
        r.mobile || '—',
        r.state || '—',
        r.city || '—',
        r.aadhar || '—',
        r.files || 0,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] },
      alternateRowStyles: { fillColor: [248, 248, 255] },
    });

    doc.save(`customers_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const loadCustomers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await customersApi.list();
      if (Array.isArray(data)) {
        setRows(data.map(normalizeCustomer));
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      setError(extractError(err) || "Unable to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (formError) setFormError("");
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    const trimmedName = form.name.trim();
    const mobileClean = form.mobile.replace(/\D/g, "");

    if (!trimmedName) nextErrors.name = "Name is required";
    else if (!/^[A-Za-z ]+$/.test(trimmedName)) nextErrors.name = "Name must contain letters and spaces only";

    if (!form.mobile.trim()) nextErrors.mobile = "Mobile number is required";
    else if (!/^\d{10}$/.test(mobileClean)) nextErrors.mobile = "Mobile number must be exactly 10 digits";

    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!form.date_of_birth) nextErrors.date_of_birth = "DOB is required";
    if (!form.aadhar_number.trim()) nextErrors.aadhar_number = "Aadhaar is required";
    if (!form.city.trim()) nextErrors.city = "City is required";
    if (!form.pincode.trim()) nextErrors.pincode = "Pincode is required";
    if (!form.address.trim()) nextErrors.address = "Address is required";
    if (!form.state.trim()) nextErrors.state = "State is required";

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async () => {
    setFormError("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload: any = {
        full_name: form.name.trim(),
        mobile_1: form.mobile.replace(/\D/g, ""),
        customer_type: form.customer_type,
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        date_of_birth: form.date_of_birth,
        aadhar_number: form.aadhar_number.trim(),
      };

      if (form.mobile_2) payload.mobile_2 = form.mobile_2.replace(/\D/g, "");
      if (form.pan_number) payload.pan_number = form.pan_number.trim().toUpperCase();

      const created = await customersApi.create(payload);
      setRows([normalizeCustomer(created), ...rows]);
      setForm(emptyForm());
      setFormErrors({});
      setFormError("");
      setOpen(false);
    } catch (err: any) {
      setFormError(extractError(err) || "Unable to create customer");
    } finally {
      setLoading(false);
    }
  };

  function extractError(err: any): string | undefined {
    const resp = err?.response?.data;
    if (!resp) return err?.message;
    const detail = resp.detail ?? resp.message;
    if (!detail) return typeof resp === "string" ? resp : JSON.stringify(resp);
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d: any) => d?.msg || (typeof d === "string" ? d : JSON.stringify(d))).join("; ");
    }
    return String(detail);
  }

  const openEdit = (raw: any) => {
    setEditCustomer(raw);
    setEditForm({
      name: raw.full_name || "",
      mobile: raw.mobile_1 || "",
      mobile_2: raw.mobile_2 || "",
      email: raw.email || "",
      address: raw.address || "",
      city: raw.city || "",
      state: raw.state || "",
      pincode: raw.pincode || "",
      date_of_birth: raw.date_of_birth ? raw.date_of_birth.slice(0, 10) : "",
      aadhar_number: raw.aadhar_number || "",
      pan_number: raw.pan_number || "",
      customer_type: raw.customer_type || "individual",
    });
  };

  const handleEditSave = async () => {
    if (!editCustomer) return;
    setLoading(true);
    try {
      const payload: any = {
        full_name: editForm.name.trim(),
        mobile_1: editForm.mobile.replace(/\D/g, ""),
        customer_type: editForm.customer_type,
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
        pincode: editForm.pincode.trim(),
        date_of_birth: editForm.date_of_birth,
        aadhar_number: editForm.aadhar_number.trim(),
      };
      if (editForm.mobile_2) payload.mobile_2 = editForm.mobile_2.replace(/\D/g, "");
      if (editForm.pan_number) payload.pan_number = editForm.pan_number.trim().toUpperCase();

      const updated = await customersApi.update(editCustomer.id, payload);
      setRows(rows.map(r => r.id === editCustomer.id ? normalizeCustomer(updated) : r));
      message.success("Customer updated successfully");
      setEditCustomer(null);
    } catch (err: any) {
      message.error(extractError(err) || "Failed to update customer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="All registered customers and client accounts within the system" />

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--gray-400)", fontWeight: 500 }}>Loading customer pipeline directory...</div>
      ) : (
        <DataTable
          rows={rows}
          search={search}
          onSearchChange={setSearch}
          searchKeys={["name", "mobile", "city", "state", "email", "aadhar"]}
          onAdd={() => setOpen(true)}
          addLabel="New customer"
          rightSlot={
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => {
                  setExportMode('excel');
                  setExportModalOpen(true);
                }}
              >
                <FileSpreadsheet size={14} /> Export Excel
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
                onClick={() => {
                  setExportMode('pdf');
                  setExportModalOpen(true);
                }}
              >
                <FileDown size={14} /> Export PDF
              </button>
            </>
          }
          columns={[
            {
              key: "id",
              label: "ID",
              render: (r) => (
                <span style={{ fontFamily: "monospace", color: "var(--gray-400)", fontSize: "0.8rem" }} title={r.id}>
                  #{r.id.slice(0, 6)}
                </span>
              ),
            },
            {
              key: "name",
              label: "Customer Name",
              render: (r) => (
                <span style={{ color: "var(--brand-600)", fontWeight: 600, cursor: "pointer" }} onClick={() => navigate(`/customers/${r.id}`)}>
                  {r.name}
                </span>
              ),
            },
            { key: "type", label: "Type" },
            { key: "mobile", label: "Mobile" },
            { key: "state", label: "State" },
            { key: "city", label: "City" },
            { key: "aadhar", label: "Aadhaar" },
            {
              key: "files",
              label: "Active Files",
              render: (r) => (
                <span style={{ background: r.files > 0 ? "var(--brand-50)" : "var(--gray-50)", color: r.files > 0 ? "var(--brand-700)" : "var(--gray-400)", padding: "4px 8px", borderRadius: 6, fontWeight: 600, fontSize: "0.8rem" }}>
                  {r.files} active
                </span>
              ),
            },
            {
              key: "action",
              label: "Action",
              render: (r) => (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: '5px 10px' }}
                    onClick={() => setViewCustomer(r.raw)}
                    title="View details"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    style={{ padding: '5px 10px', borderColor: '#a5b4fc', color: '#4f46e5' }}
                    onClick={() => openEdit(r.raw)}
                    title="Edit customer"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )
            }
          ]}
        />
      )}

      {/* Registration Modal */}
      <Modal open={open} title="Register New Customer" onClose={() => setOpen(false)} onSubmit={handleCreate} maxWidth="760px">
        {formError && <div className="form-error">{formError}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Full Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input className={`form-input ${formErrors.name ? "error" : ""}`} value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
              {formErrors.name && <span className="form-error">{formErrors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input className={`form-input ${formErrors.mobile ? "error" : ""}`} value={form.mobile} onChange={(e) => updateForm("mobile", e.target.value)} placeholder="10 digits" required />
              {formErrors.mobile && <span className="form-error">{formErrors.mobile}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Alt Mobile Number</label>
              <input className="form-input" value={form.mobile_2} onChange={(e) => updateForm("mobile_2", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="email" className={`form-input ${formErrors.email ? "error" : ""}`} value={form.email} onChange={(e) => updateForm("email", e.target.value)} />
              {formErrors.email && <span className="form-error">{formErrors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="date" className={`form-input ${formErrors.date_of_birth ? "error" : ""}`} value={form.date_of_birth} onChange={(e) => updateForm("date_of_birth", e.target.value)} />
              {formErrors.date_of_birth && <span className="form-error">{formErrors.date_of_birth}</span>}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Customer Type</label>
              <select className="form-select" value={form.customer_type} onChange={(e) => updateForm("customer_type", e.target.value)}>
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input className={`form-input ${formErrors.aadhar_number ? "error" : ""}`} value={form.aadhar_number} onChange={(e) => updateForm("aadhar_number", e.target.value)} placeholder="12 digits" />
              {formErrors.aadhar_number && <span className="form-error">{formErrors.aadhar_number}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">PAN Number</label>
              <input className="form-input" value={form.pan_number} onChange={(e) => updateForm("pan_number", e.target.value)} placeholder="ABCDE1234F" style={{ textTransform: "uppercase" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="form-group">
                <label className="form-label">State <span style={{ color: '#dc2626' }}>*</span></label>
                <input className={`form-input ${formErrors.state ? "error" : ""}`} value={form.state} onChange={(e) => updateForm("state", e.target.value)} />
                {formErrors.state && <span className="form-error">{formErrors.state}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">City <span style={{ color: '#dc2626' }}>*</span></label>
                <input className={`form-input ${formErrors.city ? "error" : ""}`} value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
                {formErrors.city && <span className="form-error">{formErrors.city}</span>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Pincode <span style={{ color: '#dc2626' }}>*</span></label>
              <input className={`form-input ${formErrors.pincode ? "error" : ""}`} value={form.pincode} onChange={(e) => updateForm("pincode", e.target.value)} />
              {formErrors.pincode && <span className="form-error">{formErrors.pincode}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Full Address <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea className={`form-input ${formErrors.address ? "error" : ""}`} rows={1} value={form.address} onChange={(e) => updateForm("address", e.target.value)} style={{ resize: "vertical" }} />
              {formErrors.address && <span className="form-error">{formErrors.address}</span>}
            </div>
          </div>
        </div>
      </Modal>

      {/* View Details Modal */}
      {viewCustomer && (
        <div className="modal-backdrop" onClick={() => setViewCustomer(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Customer Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setViewCustomer(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Full Name</label><p style={{ margin: 0, fontWeight: 500, color: 'var(--gray-900)' }}>{viewCustomer.full_name}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Customer Type</label><p style={{ margin: 0, textTransform: 'capitalize' }}>{viewCustomer.customer_type}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Mobile 1</label><p style={{ margin: 0 }}>{viewCustomer.mobile_1}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Mobile 2</label><p style={{ margin: 0 }}>{viewCustomer.mobile_2 || '—'}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Email</label><p style={{ margin: 0 }}>{viewCustomer.email || '—'}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Date of Birth</label><p style={{ margin: 0 }}>{viewCustomer.date_of_birth || '—'}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Aadhaar Number</label><p style={{ margin: 0, fontFamily: 'monospace' }}>{viewCustomer.aadhar_number || '—'}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>PAN Number</label><p style={{ margin: 0, fontFamily: 'monospace' }}>{viewCustomer.pan_number || '—'}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>State</label><p style={{ margin: 0 }}>{viewCustomer.state}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>City</label><p style={{ margin: 0 }}>{viewCustomer.city}</p></div>
                <div><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Pincode</label><p style={{ margin: 0 }}>{viewCustomer.pincode}</p></div>
                <div style={{ gridColumn: 'span 2' }}><label className="form-label" style={{ color: 'var(--gray-500)', fontSize: '0.75rem', marginBottom: 4 }}>Full Address</label><p style={{ margin: 0 }}>{viewCustomer.address}</p></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline btn-sm" onClick={() => { setViewCustomer(null); openEdit(viewCustomer); }}>Edit Customer</button>
              <button className="btn btn-primary btn-sm" onClick={() => setViewCustomer(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editCustomer && (
        <Modal open={!!editCustomer} title={`Edit Customer — ${editCustomer.full_name}`} onClose={() => setEditCustomer(null)} onSubmit={handleEditSave} maxWidth="760px">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input className="form-input" value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <input className="form-input" value={editForm.mobile} onChange={(e) => setEditForm(p => ({ ...p, mobile: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Alt Mobile</label>
                <input className="form-input" value={editForm.mobile_2} onChange={(e) => setEditForm(p => ({ ...p, mobile_2: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-input" value={editForm.date_of_birth} onChange={(e) => setEditForm(p => ({ ...p, date_of_birth: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Customer Type</label>
                <select className="form-select" value={editForm.customer_type} onChange={(e) => setEditForm(p => ({ ...p, customer_type: e.target.value }))}>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Aadhaar Number</label>
                <input className="form-input" value={editForm.aadhar_number} onChange={(e) => setEditForm(p => ({ ...p, aadhar_number: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Number</label>
                <input className="form-input" value={editForm.pan_number} onChange={(e) => setEditForm(p => ({ ...p, pan_number: e.target.value }))} style={{ textTransform: 'uppercase' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={editForm.state} onChange={(e) => setEditForm(p => ({ ...p, state: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={editForm.city} onChange={(e) => setEditForm(p => ({ ...p, city: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input className="form-input" value={editForm.pincode} onChange={(e) => setEditForm(p => ({ ...p, pincode: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-input" rows={2} value={editForm.address} onChange={(e) => setEditForm(p => ({ ...p, address: e.target.value }))} style={{ resize: 'vertical' }} required />
              </div>
            </div>
          </div>
        </Modal>
      )}

      <SelectiveExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Select Customers to Export"
        rows={filteredRows}
        getRecordName={(r) => r.name || 'Customer'}
        getRecordIdentifier={(r) => r.id}
        mode={exportMode}
        onExportExcel={exportExcel}
        onExportTable={exportPDF}
        onExportZip={async (selected) => {
          await exportDetailPDFsAsZip(
            `customers_details_${new Date().toISOString().slice(0, 10)}`,
            selected,
            (c) => {
              const raw = c.raw || c;
              return [
                { label: 'Full Name', value: raw.full_name },
                { label: 'Customer Type', value: raw.customer_type },
                { label: 'Mobile 1', value: raw.mobile_1 },
                { label: 'Mobile 2', value: raw.mobile_2 },
                { label: 'Email', value: raw.email },
                { label: 'Date of Birth', value: raw.date_of_birth },
                { label: 'Aadhaar Number', value: raw.aadhar_number },
                { label: 'PAN Number', value: raw.pan_number },
                { label: 'State', value: raw.state },
                { label: 'City', value: raw.city },
                { label: 'Pincode', value: raw.pincode },
                { label: 'Full Address', value: raw.address },
              ];
            },
            (r) => `${r.name || 'Customer'}_${r.id ? r.id.slice(0, 6) : ''}`,
            'Customer',
            'Customer File'
          );
        }}
      />
    </>
  );
}