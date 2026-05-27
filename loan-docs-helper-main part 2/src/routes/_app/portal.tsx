import { createFileRoute, Link } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { mockFiles, mockNotifications } from "@/lib/mockData";
export const Route = createFileRoute("/_app/portal")({ component: Page });
function Page(){
  const myFiles = mockFiles.slice(0,2);
  return(<><PageHeader title="My account" subtitle="Status of your loan & insurance files" />
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16}}>
      <div className="section-card"><h3>My files</h3>
        {myFiles.map(f=>(
          <Link key={f.id} to="/portal/files/$id" params={{id:f.id}} style={{display:"block",padding:"12px 0",borderBottom:"1px solid var(--gray-100)"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><b>{f.id}</b> — {f.type}<div style={{fontSize:".8rem",color:"var(--gray-500)"}}>{f.bank}</div></div>
              <span className="badge badge-blue">{f.status}</span>
            </div>
          </Link>
        ))}
      </div>
      <div className="section-card"><h3>Notifications</h3>
        {mockNotifications.map(n=>(<div key={n.id} style={{padding:"8px 0",fontSize:".88rem"}}>{n.message}<div style={{fontSize:".72rem",color:"var(--gray-400)"}}>{n.time}</div></div>))}
      </div>
    </div></>);
}
