import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockCustomers } from "@/lib/mockData";

export const Route = createFileRoute("/_app/agent/customers")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockCustomers.slice(0, 3));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", city: "" });
  const save = () => {
    if (!form.name) return;
    setRows([{ id: `C${String(rows.length + 200).slice(-3)}`, ...form, files: 0, created: new Date().toISOString().slice(0, 10) }, ...rows]);
    setForm({ name: "", mobile: "", city: "" });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="My customers" subtitle="Leads you have onboarded" />
      <DataTable rows={rows} onAdd={() => setOpen(true)} addLabel="New customer" searchKeys={["name", "mobile"]}
        columns={[{ key: "id", label: "ID" }, { key: "name", label: "Name" }, { key: "mobile", label: "Mobile" },
        { key: "city", label: "City" }, { key: "files", label: "Files" }]} />
      <Modal open={open} title="New customer" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-group"><label className="form-label">Name<span className="req">*</span></label>
          <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Mobile</label>
            <input className="form-input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">City</label>
            <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
