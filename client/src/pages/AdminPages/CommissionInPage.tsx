import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockCommissionsIn } from '../../lib/mockData'

export default function CommissionInPage() {
  return (
    <>
      <PageHeader title="Commission IN" subtitle="Commissions received from banks / insurers" />
      <DataTable
        rows={mockCommissionsIn}
        searchKeys={['id', 'file', 'payment_by']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',         label: 'ID'     },
          { key: 'file',       label: 'File'   },
          { key: 'payment_by', label: 'From'   },
          { key: 'amount',     label: 'Amount', render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: 'date',       label: 'Date'   },
        ]}
      />
    </>
  )
}
