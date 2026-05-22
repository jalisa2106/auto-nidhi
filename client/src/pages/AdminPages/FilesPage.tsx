import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import PageHeader from "../../components/app/PageHeader";
import DataTable from "../../components/app/DataTable";
import { filesApi } from "../../api/services";
import { message } from "antd";

export default function FilesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeF, setTypeF] = useState("");
  const [statusF, setStatusF] = useState("");

  // Fetch data from backend whenever filters change
  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await filesApi.list(
        1,
        20,
        statusF || undefined,
        typeF || undefined,
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
  }, [typeF, statusF]); // Refetch when filters change

  const statusBadge = (s: string) => {
    // Standardizing case for badge matching
    const status = s.toLowerCase();
    const c =
      status === "completed"
        ? "badge-green"
        : status === "cancelled"
          ? "badge-red"
          : status === "disbursed"
            ? "badge-blue"
            : status === "draft"
              ? "badge-gray"
              : "badge-gold";
    return <span className={`badge ${c}`}>{s}</span>;
  };

  return (
    <>
      <PageHeader
        title="Files"
        subtitle="All loan & insurance files"
        actions={
          <Link to="/files/new" className="btn btn-primary btn-sm">
            + New file
          </Link>
        }
      />

      <div
        style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}
      >
        <select
          className="form-select"
          style={{ maxWidth: 180 }}
          value={typeF}
          onChange={(e) => setTypeF(e.target.value)}
        >
          <option value="">All types</option>
          <option value="new_vehicle">New</option>
          <option value="used_vehicle">Used</option>
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
        </select>
      </div>

      <DataTable
        rows={rows}
        loading={loading}
        searchKeys={["file_number", "customer", "file_type"]}
        columns={[
          {
            key: "file_number", 
            label: "File #",
            render: (r) => (
              <a
                className="auth-link"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/files/${r.id}`)}
              >
                {r.file_number}
              </a>
            ),
          },
          { key: "customer", label: "Customer" },
          { key: "file_type", label: "Type" }, 
          {
            key: "status",
            label: "Status",
            render: (r) => statusBadge(r.status),
          },
          { key: "created", label: "Created" },
        ]}
      />
    </>
  );
}
