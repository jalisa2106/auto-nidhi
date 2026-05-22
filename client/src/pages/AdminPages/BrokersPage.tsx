import PageHeader from '../../components/app/PageHeader'
import DataTable from '../../components/app/DataTable'
import { mockBrokers } from '../../lib/mockData'

export default function BrokersPage() {
  return (
    <>
      <PageHeader title="Brokers" subtitle="Broker master" />
      <DataTable
        rows={mockBrokers}
        searchKeys={['name', 'area']}
        onAdd={() => {}}
        addLabel="Add new"
        columns={[
          { key: 'id',       label: 'ID'       },
          { key: 'name',     label: 'Name'     },
          { key: 'area',     label: 'Area'     },
          { key: 'district', label: 'District' },
          { key: 'phone',    label: 'Phone'    },
        ]}
      />
    </>
  )
}
