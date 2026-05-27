import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
export const Route = createFileRoute("/_app/settings/company")({ component: Page });
function Page() {
  return (<><PageHeader title="Company settings" />
    <div className="section-card"><h3>Company profile</h3>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Company name</label><input className="form-input" defaultValue="AutoNidhi Consultancy" /></div>
        <div className="form-group"><label className="form-label">GSTIN</label><input className="form-input" /></div>
        <div className="form-group"><label className="form-label">PAN</label><input className="form-input" /></div>
        <div className="form-group"><label className="form-label">Insurance alert days</label><input className="form-input" type="number" defaultValue={30} /></div>
        <div className="form-group" style={{gridColumn:"1/-1"}}><label className="form-label">Address</label><textarea className="form-textarea" /></div>
      </div>
      <button className="btn btn-primary btn-sm">Save</button>
    </div></>);
}
