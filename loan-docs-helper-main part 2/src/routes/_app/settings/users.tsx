import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockUsers } from "@/lib/mockData";

export const Route = createFileRoute("/_app/settings/users")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>(mockUsers);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first: "", last: "", email: "", role: "staff" });
  const save = () => {
    if (!form.first || !form.email) return;
    setRows([{ id: `U${String(rows.length + 100).slice(-3)}`, ...form, active: true, lastLogin: "—" }, ...rows]);
    setForm({ first: "", last: "", email: "", role: "staff" });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="User management" subtitle="Invite & manage staff / agents" />
      <DataTable rows={rows} onAdd={() => setOpen(true)} addLabel="Invite user" searchKeys={["first", "last", "email"]}
        columns={[
          { key: "id", label: "ID" }, { key: "first", label: "First" }, { key: "last", label: "Last" }, { key: "email", label: "Email" },
          { key: "role", label: "Role", render: (r) => <span className="badge badge-blue">{r.role}</span> },
          { key: "active", label: "Status", render: (r) => r.active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span> },
          { key: "lastLogin", label: "Last login" },
        ]} />
      <Modal open={open} title="Invite user" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">First name<span className="req">*</span></label>
            <input className="form-input" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Last name</label>
            <input className="form-input" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Email<span className="req">*</span></label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Role</label>
            <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin</option><option value="staff">Staff</option>
              <option value="accountant">Accountant</option><option value="data_entry">Data Entry</option>
              <option value="agent">Agent</option>
            </select></div>
        </div>
      </Modal>
    </>
  );
}
