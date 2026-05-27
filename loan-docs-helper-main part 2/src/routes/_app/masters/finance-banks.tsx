import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockBanks } from "@/lib/mockData";

export const Route = createFileRoute("/_app/masters/finance-banks")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Finance Banks" />
      <DataTable rows={mockBanks} searchKeys={["name"]} onAdd={() => {}} addLabel="Add new" columns={[{key:"id",label:"ID"},{key:"name",label:"Bank"},{key:"area",label:"Area"},{key:"contact",label:"Contact"}]} />
    </>
  );
}
