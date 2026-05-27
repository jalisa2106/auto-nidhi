import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";

export const Route = createFileRoute("/_app/settings/banks")({ component: Page });

function Page() {
  const [rows, setRows] = useState<any[]>([{ id: "BA001", bank: "HDFC", ac: "50100xxxxxx", ifsc: "HDFC0001234", area: "Pune" }]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ bank: "", ac: "", ifsc: "", area: "" });
  const save = () => {
    if (!form.bank || !form.ac) return;
    setRows([{ id: `BA${String(rows.length + 100).slice(-3)}`, ...form }, ...rows]);
    setForm({ bank: "", ac: "", ifsc: "", area: "" });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="Own bank accounts" subtitle="Accounts you receive payments into" />
      <DataTable rows={rows} onAdd={() => setOpen(true)} addLabel="Add account" searchKeys={["bank"]}
        columns={[{ key: "id", label: "ID" }, { key: "bank", label: "Bank" }, { key: "ac", label: "A/C" }, { key: "ifsc", label: "IFSC" }, { key: "area", label: "Area" }]} />
      <Modal open={open} title="Add bank account" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Bank<span className="req">*</span></label>
            <input className="form-input" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Account no.<span className="req">*</span></label>
            <input className="form-input" value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">IFSC</label>
            <input className="form-input" value={form.ifsc} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></div>
          <div className="form-group"><label className="form-label">Branch / Area</label>
            <input className="form-input" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
