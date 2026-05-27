import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockInsuranceCos } from "@/lib/mockData";

export const Route = createFileRoute("/_app/masters/insurance-companies")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Insurance Companies" />
      <DataTable rows={mockInsuranceCos} searchKeys={["name"]} onAdd={() => {}} addLabel="Add new" columns={[{key:"id",label:"ID"},{key:"name",label:"Name"},{key:"person",label:"Contact Person"},{key:"mobile",label:"Mobile"}]} />
    </>
  );
}
