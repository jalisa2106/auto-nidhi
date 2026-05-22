import PageHeader from '../../components/app/PageHeader'

export default function CompanySettingsPage() {
  return (
    <>
      <PageHeader title="Company Settings" subtitle="Business details — GSTIN, PAN, Address" />
      <div className="section-card">
        <h3>Company profile</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Company name</label>
            <input className="form-input" defaultValue="AutoNidhi Consultancy" />
          </div>
          <div className="form-group">
            <label className="form-label">GSTIN</label>
            <input className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">PAN</label>
            <input className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Insurance alert days</label>
            <input className="form-input" type="number" defaultValue={30} />
          </div>
          <div className="form-group" style={{ gridColumn: '1/-1' }}>
            <label className="form-label">Address</label>
            <textarea className="form-textarea" rows={3} />
          </div>
        </div>
        <button className="btn btn-primary btn-sm">Save</button>
      </div>
    </>
  )
}
