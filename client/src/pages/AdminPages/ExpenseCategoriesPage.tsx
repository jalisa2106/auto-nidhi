import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockExpenseCategories } from '../../lib/mockData'

export default function ExpenseCategoriesPage() {
  return (
    <>
      <PageHeader title="Expense Categories" subtitle="Expense category master" />
      <DataTable
        rows={mockExpenseCategories}
        searchKeys={['name']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',   label: 'ID'   },
          { key: 'name', label: 'Name' },
        ]}
      />
    </>
  )
}
