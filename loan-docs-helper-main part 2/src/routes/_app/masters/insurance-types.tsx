import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockInsuranceTypes } from "@/lib/mockData";

export const Route = createFileRoute("/_app/masters/insurance-types")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Insurance Types" />
      <DataTable rows={mockInsuranceTypes} searchKeys={["name"]} onAdd={() => {}} addLabel="Add new" columns={[{key:"id",label:"ID"},{key:"name",label:"Name"}]} />
    </>
  );
}
