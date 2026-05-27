import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import { mockNotifications } from "@/lib/mockData";
export const Route = createFileRoute("/_app/portal/notifications")({ component: Page });
function Page(){return(<><PageHeader title="Notifications" />
  <div className="data-card">{mockNotifications.map(n=>(
    <div key={n.id} style={{padding:"14px 18px",borderBottom:"1px solid var(--gray-100)"}}>
      <div style={{fontWeight:n.read?400:600}}>{n.message}</div>
      <div style={{fontSize:".75rem",color:"var(--gray-400)"}}>{n.time}</div>
    </div>))}</div></>);}
