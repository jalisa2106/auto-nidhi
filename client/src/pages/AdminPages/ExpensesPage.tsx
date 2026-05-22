import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockExpenses } from '../../lib/mockData'

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Expenses" subtitle="General business and operational expenses" />
      <DataTable
        rows={mockExpenses}
        searchKeys={['id', 'category']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',       label: 'ID'       },
          { key: 'category', label: 'Category' },
          { key: 'amount',   label: 'Amount',  render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: 'date',     label: 'Date'     },
        ]}
      />
    </>
  )
}
