import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockCommissionsOut } from '../../lib/mockData'

export default function CommissionOutPage() {
  return (
    <>
      <PageHeader title="Commission OUT" subtitle="Commissions paid to agents / brokers" />
      <DataTable
        rows={mockCommissionsOut}
        searchKeys={['id', 'file', 'payee']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',         label: 'ID'       },
          { key: 'file',       label: 'File'     },
          { key: 'payee_type', label: 'Type'     },
          { key: 'payee',      label: 'Payee'    },
          { key: 'amount',     label: 'Amount',   render: (r) => `₹${r.amount.toLocaleString()}` },
          { key: 'mode',       label: 'Mode'     },
          { key: 'date',       label: 'Date'     },
          { key: 'advance',    label: 'Advance',  render: (r) => r.advance ? 'Yes' : 'No' },
        ]}
      />
    </>
  )
}
