import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { BrandPanel } from "./login";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — AutoNidhi" }] }),
  component: Page,
});

function Page() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-panel-right">
        <div className="auth-form-container">
          <Link to="/login" className="auth-back"><ArrowLeft size={14} /> Back to sign in</Link>
          <div className="auth-form-header">
            <div className="auth-form-title">Reset your password</div>
            <div className="auth-form-sub">We'll email you a reset link if the account exists.</div>
          </div>
          {sent ? (
            <div className="auth-alert auth-alert-success" style={{ background: "var(--surface-1)", padding: 14, borderRadius: 10, display: "flex", gap: 10 }}>
              <CheckCircle2 size={18} color="var(--brand-700)" />
              <span>If <strong>{email}</strong> matches an account, we've sent reset instructions.</span>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
              <div className="form-group">
                <label className="form-label">Email<span className="req">*</span></label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={16} /></span>
                  <input className="form-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>Send reset link</button>
            </form>
          )}
          <div className="auth-footer-text">
            Remember it? <Link to="/login" className="auth-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
