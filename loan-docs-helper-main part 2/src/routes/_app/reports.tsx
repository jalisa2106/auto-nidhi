import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import StatCard from "@/components/app/StatCard";
import { mockFiles, mockPaymentsIn, mockPaymentsOut, mockCommissionsIn, mockCommissionsOut, mockExpenses, fileStatuses } from "@/lib/mockData";

export const Route = createFileRoute("/_app/reports")({ component: Page });

function sum(arr: { amount: number }[]) { return arr.reduce((s, x) => s + x.amount, 0); }

function Page() {
  const inflow = sum(mockPaymentsIn) + sum(mockCommissionsIn);
  const outflow = sum(mockPaymentsOut) + sum(mockCommissionsOut) + sum(mockExpenses);
  return (
    <>
      <PageHeader title="Reports" subtitle="Financial & operational summaries" />
      <div className="stats-grid">
        <StatCard label="Total inflow" value={`₹${inflow.toLocaleString()}`} delta="Payments + commissions IN" up />
        <StatCard label="Total outflow" value={`₹${outflow.toLocaleString()}`} delta="Payments + commissions OUT + expenses" />
        <StatCard label="Net" value={`₹${(inflow - outflow).toLocaleString()}`} delta={inflow - outflow >= 0 ? "Profit" : "Loss"} up={inflow - outflow >= 0} />
        <StatCard label="Active files" value={mockFiles.filter((f) => f.status !== "Completed" && f.status !== "Cancelled").length} />
      </div>
      <div className="section-card">
        <h3>Files by status</h3>
        <table className="data-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>{fileStatuses.map((s) => <tr key={s}><td>{s}</td><td>{mockFiles.filter((f) => f.status === s).length}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="section-card">
        <h3>Expense breakdown</h3>
        <table className="data-table">
          <thead><tr><th>Category</th><th>Amount</th></tr></thead>
          <tbody>{mockExpenses.map((e) => <tr key={e.id}><td>{e.category}</td><td>₹{e.amount.toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}
