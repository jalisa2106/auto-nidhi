import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockBanks } from '../../lib/mockData'

export default function FinanceBanksPage() {
  return (
    <>
      <PageHeader title="Finance Banks" subtitle="Banks offering finance / loan products" />
      <DataTable
        rows={mockBanks}
        searchKeys={['name']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',      label: 'ID'      },
          { key: 'name',    label: 'Bank'    },
          { key: 'area',    label: 'Area'    },
          { key: 'contact', label: 'Contact' },
        ]}
      />
    </>
  )
}
