import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockInsurancePayments } from '../../lib/mockData'

export default function InsurancePaymentsPage() {
  return (
    <>
      <PageHeader title="Insurance Payments" subtitle="Insurance premium payments" />
      <DataTable
        rows={mockInsurancePayments}
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
