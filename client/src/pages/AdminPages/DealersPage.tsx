import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockDealers } from '../../lib/mockData'

export default function DealersPage() {
  return (
    <>
      <PageHeader title="Dealers" subtitle="Dealer master" />
      <DataTable
        rows={mockDealers}
        searchKeys={['name', 'city']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',    label: 'ID'    },
          { key: 'name',  label: 'Name'  },
          { key: 'city',  label: 'City'  },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
        ]}
      />
    </>
  )
}
