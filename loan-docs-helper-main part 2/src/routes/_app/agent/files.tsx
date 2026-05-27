import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockFiles } from "@/lib/mockData";
export const Route = createFileRoute("/_app/agent/files")({ component: Page });
function Page(){return(<><PageHeader title="My files" />
  <DataTable rows={mockFiles.slice(0,3)} searchKeys={["id","customer"]} columns={[
    {key:"id",label:"File"},{key:"customer",label:"Customer"},{key:"type",label:"Type"},{key:"status",label:"Status"},{key:"created",label:"Created"}
  ]} /></>);}
