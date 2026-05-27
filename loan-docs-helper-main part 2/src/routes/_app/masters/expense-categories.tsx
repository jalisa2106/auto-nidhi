import { createFileRoute } from "@tanstack/react-router";
import PageHeader from "@/components/app/PageHeader";
import DataTable from "@/components/app/DataTable";
import { mockExpenseCategories } from "@/lib/mockData";

export const Route = createFileRoute("/_app/masters/expense-categories")({ component: Page });
function Page() {
  return (
    <>
      <PageHeader title="Expense Categories" />
      <DataTable rows={mockExpenseCategories} searchKeys={["name"]} onAdd={() => {}} addLabel="Add new" columns={[{key:"id",label:"ID"},{key:"name",label:"Name"}]} />
    </>
  );
}
