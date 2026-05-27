import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Car, Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, FileText, BarChart3, AlertCircle, LogIn } from "lucide-react";
import { apiPost } from "@/lib/api";
import { setSession, type Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — AutoNidhi" }] }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError("Please fill both email and password."); return; }
    setLoading(true);
    try {
      const data = await apiPost<any>("/api/login", { email, password });
      const role = (data.role as Role) || "customer";
      setSession(
        { email: data.user || email, role, name: data.first_name || "User" },
        data.access_token || "local-dev-token",
      );
      const dest = role === "customer" ? "/portal" : role === "agent" ? "/agent/dashboard" : "/dashboard";
      router.navigate({ to: dest });
    } catch (err: any) {
      setError(err?.message || "Failed to sign in. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <Link to="/" className="auth-back"><ArrowLeft size={14} /> Back to home</Link>
          <div className="auth-form-header">
            <div className="auth-form-title">Welcome back</div>
            <div className="auth-form-sub">Sign in to continue to AutoNidhi</div>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label">Email<span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input className="form-input" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password<span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={16} /></span>
                <input className="form-input" type={showPw ? "text" : "password"} placeholder="Enter password"
                  value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                <button type="button" className="input-icon-right" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="auth-row">
              <label className="auth-checkbox">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
              <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              <LogIn size={16} /> {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="auth-footer-text">
            Don't have an account? <Link to="/signup" className="auth-link">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandPanel() {
  return (
    <div className="auth-panel-left">
      <div className="auth-brand">
        <div className="auth-logo-mark"><Car size={32} color="#fff" /></div>
        <div className="auth-brand-name">Auto<span>Nidhi</span></div>
        <div className="auth-brand-tagline">Driving smarter business operations for India's auto finance consultants.</div>
      </div>
      <div className="auth-features">
        {[
          { icon: <ShieldCheck size={18} />, title: "Trusted Operations", desc: "Role-based access with full audit trail" },
          { icon: <FileText size={18} />, title: "Documentation Flow", desc: "KYC, RC, insurance — all in one place" },
          { icon: <BarChart3 size={18} />, title: "Business Insights", desc: "KPIs, commissions and pipeline at a glance" },
        ].map((f) => (
          <div key={f.title} className="auth-feature-item">
            <div className="auth-feature-icon">{f.icon}</div>
            <div>
              <div className="auth-feature-title">{f.title}</div>
              <div className="auth-feature-desc">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
