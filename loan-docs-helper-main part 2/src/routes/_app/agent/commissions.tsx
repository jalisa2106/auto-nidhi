import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
const rows=[{id:"X1",file:"F1001",amount:6000,status:"Pending",date:"2025-10-12"},{id:"X2",file:"F1003",amount:3500,status:"Received",date:"2025-10-14"}];
export const Route = createFileRoute("/_app/agent/commissions")({ component: Page });
function Page(){return(<><PageHeader title="My commissions" subtitle="Read-only" />
  <DataTable rows={rows} searchKeys={["file"]} columns={[
    {key:"id",label:"ID"},{key:"file",label:"File"},{key:"amount",label:"Amount",render:(r)=>`₹${r.amount.toLocaleString()}`},
    {key:"status",label:"Status",render:(r)=><span className={`badge ${r.status==="Received"?"badge-green":"badge-gold"}`}>{r.status}</span>},
    {key:"date",label:"Date"}
  ]} /></>);}
