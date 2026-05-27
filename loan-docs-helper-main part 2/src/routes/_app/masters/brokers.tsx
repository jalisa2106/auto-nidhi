import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockBrokers } from "@/lib/mockData";

export const Route = createFileRoute("/_app/masters/brokers")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Brokers" />
      <DataTable rows={mockBrokers} searchKeys={["name","area"]} onAdd={() => {}} addLabel="Add new" columns={[{key:"id",label:"ID"},{key:"name",label:"Name"},{key:"area",label:"Area"},{key:"district",label:"District"},{key:"phone",label:"Phone"}]} />
    </>
  );
}
