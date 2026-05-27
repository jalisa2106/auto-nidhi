import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { getCurrentUser } from "@/lib/auth";
export const Route = createFileRoute("/_app/portal/profile")({ component: Page });
function Page(){const u=getCurrentUser();
  return(<><PageHeader title="Profile" />
  <div className="section-card"><div className="form-row">
    <div className="form-group"><label className="form-label">Name</label><input className="form-input" defaultValue={u?.name||""} /></div>
    <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={u?.email||""} disabled /></div>
    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" /></div>
    <div className="form-group"><label className="form-label">City</label><input className="form-input" /></div>
  </div><button className="btn btn-primary btn-sm">Save</button></div></>);}
