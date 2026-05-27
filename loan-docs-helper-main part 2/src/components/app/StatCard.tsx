interface StatProps { label: string; value: string | number; delta?: string; up?: boolean; }
export default function StatCard({ label, value, delta, up }: StatProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {delta && <div className={`stat-delta ${up ? "up" : "down"}`}>{delta}</div>}
    </div>
  );
}
