import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, User, Phone, KeyRound, AlertCircle, UserPlus, CheckCircle2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { setSession, type Role } from "@/lib/auth";
import { BrandPanel } from "./login";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Create account — AutoNidhi" }] }),
  component: SignupPage,
});

const restrictedRoles = new Set(["admin", "accountant", "data_entry"]);

function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passkey, setPasskey] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwScore = useMemo(() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  }, [password]);
  const pwLabel = ["Too short", "Weak", "Fair", "Good", "Strong"][pwScore];
  const pwColor = ["#cbd5e1", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"][pwScore];

  const showPasskey = restrictedRoles.has(role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (showPasskey && !passkey) { setError("Passkey is required for the selected role."); return; }

    setLoading(true);
    try {
      const data = await apiPost<any>("/api/signup", {
        first_name: firstName,
        last_name: lastName || null,
        phone_number: phone || null,
        email,
        password,
        confirmPassword: confirm,
        role,
        passkey: showPasskey ? passkey : null,
      });
      const r = (data.role as Role) || role;
      setSession(
        { email: data.user || email, role: r, name: data.first_name || firstName || "User" },
        data.access_token || "local-dev-token",
      );
      const dest = r === "customer" ? "/portal" : r === "agent" ? "/agent/dashboard" : "/dashboard";
      router.navigate({ to: dest });
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Is the backend running?");
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
            <div className="auth-form-title">Create your account</div>
            <div className="auth-form-sub">Start managing your consultancy in minutes</div>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <AlertCircle size={16} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">First name<span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><User size={16} /></span>
                  <input className="form-input" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last name</label>
                <input className="form-input" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email<span className="req">*</span></label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={16} /></span>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <div className="input-wrapper">
                <span className="input-icon"><Phone size={16} /></span>
                <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 9876543210" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role<span className="req">*</span></label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="customer">Customer</option>
                <option value="agent">Agent / Field Executive</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin 🔒</option>
                <option value="accountant">Accountant 🔒</option>
                <option value="data_entry">Data Entry 🔒</option>
              </select>
              <div className="form-hint">Internal roles require a passkey provided by your admin.</div>
            </div>

            {showPasskey && (
              <div className="form-group">
                <label className="form-label">Role passkey<span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><KeyRound size={16} /></span>
                  <input type="password" className="form-input" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="Enter passkey" required />
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password<span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input type={showPw ? "text" : "password"} className="form-input"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
                  <button type="button" className="input-icon-right" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, background: "var(--gray-100)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(pwScore / 4) * 100}%`, height: "100%", background: pwColor, transition: "all .2s" }} />
                    </div>
                    <span style={{ fontSize: ".72rem", color: pwColor, fontWeight: 600 }}>{pwLabel}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm<span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={16} /></span>
                  <input type={showPw ? "text" : "password"} className="form-input"
                    value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required />
                </div>
                {confirm && password === confirm && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#15803d", fontSize: ".75rem", marginTop: 2 }}>
                    <CheckCircle2 size={12} /> Matches
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: 8 }} disabled={loading}>
              <UserPlus size={16} /> {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="auth-footer-text">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
