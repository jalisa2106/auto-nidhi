import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import Modal from "@/components/app/Modal";
import { mockAdvances } from "@/lib/mockData";

export const Route = createFileRoute("/_app/advances")({ component: Page });

function Page() {
  const [rows, setRows] = useState(mockAdvances);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ party_type: "Dealer", party: "", amount: "", date: new Date().toISOString().slice(0, 10) });
  const save = () => {
    if (!form.party || !form.amount) return;
    setRows([{ id: `A${String(rows.length + 100).slice(-3)}`, ...form, amount: Number(form.amount), recovered: 0 } as any, ...rows]);
    setForm({ party_type: "Dealer", party: "", amount: "", date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  };
  return (
    <>
      <PageHeader title="Advances" subtitle="Advance payments to dealers / brokers" />
      <DataTable rows={rows} searchKeys={["id", "party"]} onAdd={() => setOpen(true)} addLabel="Add advance"
        columns={[{ key: "id", label: "ID" }, { key: "party_type", label: "Party Type" }, { key: "party", label: "Party" },
        { key: "amount", label: "Amount", render: (r) => `₹${r.amount.toLocaleString()}` },
        { key: "recovered", label: "Recovered", render: (r) => `₹${r.recovered.toLocaleString()}` }, { key: "date", label: "Date" }]} />
      <Modal open={open} title="Add Advance" onClose={() => setOpen(false)} onSubmit={save}>
        <div className="form-row">
          <div className="form-group"><label className="form-label">Party type</label>
            <select className="form-select" value={form.party_type} onChange={(e) => setForm({ ...form, party_type: e.target.value })}>
              <option>Dealer</option><option>Broker</option><option>Agent</option>
            </select></div>
          <div className="form-group"><label className="form-label">Party name<span className="req">*</span></label>
            <input className="form-input" value={form.party} onChange={(e) => setForm({ ...form, party: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Amount<span className="req">*</span></label>
            <input className="form-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="form-group"><label className="form-label">Date</label>
            <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        </div>
      </Modal>
    </>
  );
}
