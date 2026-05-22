import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockPaymentsOut } from '../../lib/mockData'

export default function PaymentOutPage() {
  return (
    <>
      <PageHeader title="Payment OUT" subtitle="Outward payment ledger" />
      <DataTable
        rows={mockPaymentsOut}
        searchKeys={['id', 'file', 'payee']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',     label: 'ID'     },
          { key: 'file',   label: 'File'   },
          { key: 'payee',  label: 'Payee'  },
          { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: 'mode',   label: 'Mode'   },
          { key: 'date',   label: 'Date'   },
        ]}
      />
    </>
  )
}
