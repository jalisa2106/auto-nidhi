import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockPaymentsIn } from '../../lib/mockData'

export default function PaymentInPage() {
  return (
    <>
      <PageHeader title="Payment IN" subtitle="Inward payment ledger" />
      <DataTable
        rows={mockPaymentsIn}
        searchKeys={['id', 'file', 'customer']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',       label: 'ID'       },
          { key: 'file',     label: 'File'     },
          { key: 'customer', label: 'Customer' },
          { key: 'amount',   label: 'Amount',  render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: 'mode',     label: 'Mode'     },
          { key: 'date',     label: 'Date'     },
          { key: 'from',     label: 'From'     },
        ]}
      />
    </>
  )
}
