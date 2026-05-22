import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockAdvances } from '../../lib/mockData'

export default function AdvancesPage() {
  return (
    <>
      <PageHeader title="Advances" subtitle="Cash / amount advances given out" />
      <DataTable
        rows={mockAdvances}
        searchKeys={['id', 'party']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',         label: 'ID'         },
          { key: 'party_type', label: 'Party Type' },
          { key: 'party',      label: 'Party'      },
          { key: 'amount',     label: 'Amount',    render: (r) => `₹${r.amount.toLocaleString()}`    },
          { key: 'recovered',  label: 'Recovered', render: (r) => `₹${r.recovered.toLocaleString()}` },
          { key: 'date',       label: 'Date'       },
        ]}
      />
    </>
  )
}
