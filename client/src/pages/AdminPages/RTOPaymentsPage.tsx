import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockRTOPayments } from '../../lib/mockData'

export default function RTOPaymentsPage() {
  return (
    <>
      <PageHeader title="RTO Payments" subtitle="Vehicle registration / RTO payments" />
      <DataTable
        rows={mockRTOPayments}
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
